import {google} from '@ai-sdk/google'
import {generateText, Output} from 'ai'
import {NextResponse} from 'next/server'
import {ZodError} from 'zod'
import {createSearchMcpClient} from '@/lib/search/context'
import {groundSearchCandidates} from '@/lib/search/ground-results'
import {buildSearchTermSystemPrompt} from '@/lib/search/prompt'
import {
  lessonSearchRowsSchema,
  searchCandidatesSchema,
  searchRequestSchema,
  searchResponseSchema,
  searchTermsSchema,
  videoSearchRowsSchema,
  type SearchCandidate,
} from '@/lib/search/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SEARCH_DEADLINE_MS = 55_000

type SearchTimingStatus = 'cancelled' | 'failed' | 'invalid' | 'not-configured' | 'succeeded' | 'timed-out'

function roundedDuration(start: number, end: number | null) {
  return end === null ? undefined : Math.round(end - start)
}

function fallbackSearchTerms(query: string) {
  const tokens = query
    .normalize('NFKC')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []
  return [...new Set(tokens.filter((term) => term.length <= 64))].slice(0, 12)
}

function matchAny(field: string, terms: string[]) {
  return `(${terms.map((term) => `${field} match ${JSON.stringify(`*${term}*`)}`).join(' || ')})`
}

function buildLessonQuery(terms: string[], learnerQuery: string) {
  const titleMatch = matchAny('title', terms)
  const keyPointsMatch = matchAny('keyPoints[]', terms)
  const notesMatch = matchAny('pt::text(notes)', terms)
  const exactQuery = JSON.stringify(learnerQuery.normalize('NFKC').toLocaleLowerCase())
  return `*[_type == "lesson" && (
    ${titleMatch} ||
    ${keyPointsMatch} ||
    ${notesMatch}
  )] {
    "lessonId": _id,
    "exactTitleMatch": lower(title) == ${exactQuery},
    "titleMatch": ${titleMatch},
    "keyPointsMatch": ${keyPointsMatch},
    "notesMatch": ${notesMatch}
  }`
}

function buildVideoQuery(terms: string[], learnerQuery: string) {
  const exactQuery = JSON.stringify(learnerQuery.normalize('NFKC').toLocaleLowerCase())
  const chapterFilter = matchAny('label', terms)
  const chunkFilter = matchAny('text', terms)
  return `*[_type == "video" && (
    ${matchAny('chapters[].label', terms)} ||
    ${matchAny('chunks[].text', terms)}
  )] {
    "videoId": _id,
    "lessonIds": *[_type == "lesson" && videoUrl == ^.url]._id,
    "chapterMatches": chapters[${chapterFilter}] {
      startSeconds,
      "exactLabelMatch": lower(label) == ${exactQuery}
    },
    "chunkMatches": select(
      count(chapters[${chapterFilter}]) == 0 => chunks[${chunkFilter}][0...5] {startSeconds},
      []
    )
  }`
}

function parseMcpRows<T>(result: unknown, parse: (value: unknown) => T): T {
  if (!result || typeof result !== 'object' || !('content' in result) || !Array.isArray(result.content)) {
    throw new Error('Learning search query returned an invalid response')
  }
  if ('isError' in result && result.isError) throw new Error('Learning search query failed')
  const text = result.content.find((item): item is {type: 'text'; text: string} => (
    Boolean(item) && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string'
  ))?.text
  if (!text) throw new Error('Learning search query returned no data')
  const payload = JSON.parse(text) as {result?: unknown}
  return parse(payload.result)
}

function lessonRelevance(row: ReturnType<typeof lessonSearchRowsSchema.parse>[number]) {
  if (row.exactTitleMatch) return 100
  if (row.titleMatch) return row.keyPointsMatch || row.notesMatch ? 94 : 90
  if (row.keyPointsMatch) return row.notesMatch ? 79 : 75
  return 60
}

function candidatesFromRows(
  lessonRows: ReturnType<typeof lessonSearchRowsSchema.parse>,
  videoRows: ReturnType<typeof videoSearchRowsSchema.parse>,
) {
  const candidates: SearchCandidate[] = lessonRows.map((row) => ({
    kind: 'lesson',
    lessonId: row.lessonId,
    relevance: lessonRelevance(row),
  }))

  for (const row of videoRows) {
    const moments = row.chapterMatches.length > 0 ? row.chapterMatches : row.chunkMatches
    const matchSource = row.chapterMatches.length > 0 ? 'chapter' as const : 'chunk' as const
    for (const lessonId of row.lessonIds) {
      for (const moment of moments) {
        candidates.push({
          kind: 'video',
          lessonId,
          videoId: row.videoId,
          startSeconds: moment.startSeconds,
          matchSource,
          relevance: matchSource === 'chapter' && 'exactLabelMatch' in moment
            ? (moment.exactLabelMatch ? 98 : 88)
            : 70,
        })
      }
    }
  }

  return searchCandidatesSchema.parse({candidates}).candidates
}

export async function POST(request: Request) {
  let mcpClient: Awaited<ReturnType<typeof createSearchMcpClient>> | null = null
  const startedAt = performance.now()
  let setupStartedAt: number | null = null
  let setupFinishedAt: number | null = null
  let agentStartedAt: number | null = null
  let agentFinishedAt: number | null = null
  let groundingStartedAt: number | null = null
  let groundingFinishedAt: number | null = null
  let stepCount: number | undefined
  let toolCallCount: number | undefined
  let lessonRowCount: number | undefined
  let videoRowCount: number | undefined
  let candidateCount: number | undefined
  let groundedResultCount: number | undefined
  let status: SearchTimingStatus = 'failed'
  let deadlineReached = false
  const controller = new AbortController()
  const cancelFromCaller = () => controller.abort(request.signal.reason)
  if (request.signal.aborted) cancelFromCaller()
  else request.signal.addEventListener('abort', cancelFromCaller, {once: true})
  const timeout = setTimeout(() => {
    if (controller.signal.aborted) return
    deadlineReached = true
    controller.abort(new Error('Search deadline exceeded'))
  }, SEARCH_DEADLINE_MS)

  try {
    const rawBody = await request.text()
    if (rawBody.length > 4_096) {
      status = 'invalid'
      return NextResponse.json({error: 'Search request is too large.'}, {status: 413})
    }
    const body = JSON.parse(rawBody)
    const {query} = searchRequestSchema.parse(body)
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      status = 'not-configured'
      return NextResponse.json({error: 'Learning search is not configured yet.'}, {status: 503})
    }
    setupStartedAt = performance.now()
    mcpClient = await createSearchMcpClient()
    const allTools = await mcpClient.tools()
    const groqQuery = allTools.groq_query
    if (!groqQuery) throw new Error('Learning search query tool is unavailable')
    setupFinishedAt = performance.now()
    agentStartedAt = setupFinishedAt
    const model = google(process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-3.6-flash')
    let terms = fallbackSearchTerms(query)
    try {
      const termResult = await generateText({
        model,
        system: buildSearchTermSystemPrompt(),
        prompt: `Learner query: ${JSON.stringify(query)}`,
        output: Output.object({schema: searchTermsSchema}),
        temperature: 0,
        maxOutputTokens: 512,
        providerOptions: {google: {thinkingConfig: {thinkingLevel: 'minimal'}}},
        abortSignal: controller.signal,
        maxRetries: 1,
      })
      terms = [...new Set(searchTermsSchema.parse(termResult.output).terms)]
      stepCount = termResult.steps.length
    } catch (error) {
      if (controller.signal.aborted) throw error
    }
    if (!terms.length) throw new Error('Learning search could not derive safe search terms')

    const lessonQuery = buildLessonQuery(terms, query)
    const videoQuery = buildVideoQuery(terms, query)
    const [lessonMcpResult, videoMcpResult] = await Promise.all([
      groqQuery.execute(
        {query: lessonQuery},
        {toolCallId: 'lopsis-lesson-search', messages: [], abortSignal: controller.signal},
      ),
      groqQuery.execute(
        {query: videoQuery},
        {toolCallId: 'lopsis-video-search', messages: [], abortSignal: controller.signal},
      ),
    ])
    agentFinishedAt = performance.now()
    toolCallCount = 2
    const lessonRows = parseMcpRows(lessonMcpResult, (value) => lessonSearchRowsSchema.parse(value))
    const videoRows = parseMcpRows(videoMcpResult, (value) => videoSearchRowsSchema.parse(value))
    lessonRowCount = lessonRows.length
    videoRowCount = videoRows.length
    const candidates = candidatesFromRows(lessonRows, videoRows)
    candidateCount = candidates.length
    groundingStartedAt = performance.now()
    const results = await groundSearchCandidates(candidates, controller.signal)
    groundingFinishedAt = performance.now()
    groundedResultCount = results.length
    const response = searchResponseSchema.parse({
      version: 1,
      query,
      resultCount: results.length,
      courseCount: new Set(results.map((item) => item.courseId)).size,
      sortOptions: ['relevance'],
      results,
    })
    status = 'succeeded'
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      status = 'invalid'
      return NextResponse.json({error: 'Enter a search between 1 and 240 characters.'}, {status: 400})
    }
    if (deadlineReached) {
      status = 'timed-out'
      return NextResponse.json({error: 'Search took too long. Please try again.'}, {status: 504})
    }
    if (request.signal.aborted) {
      status = 'cancelled'
      return new Response(null, {status: 499})
    }
    console.error('Lopsis search failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({error: 'Search is temporarily unavailable. Please try again.'}, {status: 502})
  } finally {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', cancelFromCaller)
    await mcpClient?.close().catch(() => undefined)
    const finishedAt = performance.now()
    console.info('Lopsis search timing', {
      status,
      totalMs: Math.round(finishedAt - startedAt),
      setupMs: setupStartedAt === null ? undefined : roundedDuration(setupStartedAt, setupFinishedAt),
      agentMs: agentStartedAt === null ? undefined : roundedDuration(agentStartedAt, agentFinishedAt),
      groundingMs: groundingStartedAt === null ? undefined : roundedDuration(groundingStartedAt, groundingFinishedAt),
      stepCount,
      toolCallCount,
      lessonRowCount,
      videoRowCount,
      candidateCount,
      groundedResultCount,
    })
  }
}
