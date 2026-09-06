import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {promisify} from 'node:util'
import {getCliClient} from 'sanity/cli'

type VideoProvider = 'youtube' | 'vimeo' | 'bunny'

interface ParsedVideoSource {
  provider: VideoProvider
  providerId: string
  normalizedUrl: string
}

interface Cue {
  startSeconds: number
  text: string
}

interface Chapter {
  startSeconds: number
  label: string
}

interface ExtractedVideo {
  provider: VideoProvider
  providerId: string
  normalizedUrl: string
  title?: string
  chapters: Chapter[]
  chunks: Array<{_key: string; _type: 'object'; startSeconds: number; text: string}>
}

type CaptionEvent = {tStartMs?: number; segs?: Array<{utf8?: string}>}
type ChapterRenderer = {chapterRenderer?: {title?: {simpleText?: string}; timeRangeStartMillis?: number}}
type MarkerMap = {value?: {chapters?: ChapterRenderer[]}}
type PlayerResponse = {
  videoDetails?: {title?: string; shortDescription?: string}
  captions?: {playerCaptionsTracklistRenderer?: {captionTracks?: Array<{baseUrl?: string; languageCode?: string; kind?: string}>}}
  playerOverlays?: {
    playerOverlayRenderer?: {
      decoratedPlayerBarRenderer?: {
        decoratedPlayerBarRenderer?: {
          playerBar?: {multiMarkersPlayerBarRenderer?: {markersMap?: MarkerMap[]}}
        }
      }
    }
  }
}

const client = getCliClient({apiVersion: '2026-09-02'})
const execFileAsync = promisify(execFile)
const dryRun = process.argv.includes('--dry-run') || process.env.LOPSIS_INGEST_DRY_RUN === '1'
const force = process.argv.includes('--force') || process.env.LOPSIS_INGEST_FORCE === '1'
const requestedSlug = process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) || process.env.LOPSIS_INGEST_SLUG
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='))?.slice('--concurrency='.length)
const concurrency = Math.max(1, parseInt(concurrencyArg || process.env.LOPSIS_INGEST_CONCURRENCY || '2', 10))

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseVideoUrl(videoUrl: string): ParsedVideoSource | null {
  try {
    const url = new URL(videoUrl)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()
      if (id && /^[\w-]{6,}$/.test(id)) {
        return {
          provider: 'youtube',
          providerId: id,
          normalizedUrl: `https://www.youtube.com/watch?v=${id}`,
        }
      }
    }

    // Vimeo
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const id = url.pathname.split('/').find((part) => /^\d+$/.test(part))
      if (id) {
        return {
          provider: 'vimeo',
          providerId: id,
          normalizedUrl: `https://vimeo.com/${id}`,
        }
      }
    }

    // Bunny
    if (host.endsWith('mediadelivery.net') || host.endsWith('b-cdn.net')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const libraryId = parts.indexOf('embed') >= 0 ? parts[parts.indexOf('embed') + 1] : parts[0]
      const videoId = parts.indexOf('embed') >= 0 ? parts[parts.indexOf('embed') + 2] : parts[1]
      if (libraryId && videoId && /^[\w-]+$/.test(libraryId) && /^[\w-]+$/.test(videoId)) {
        return {
          provider: 'bunny',
          providerId: `${libraryId}/${videoId}`,
          normalizedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
        }
      }
    }
  } catch {
    return null
  }
  return null
}

function extractJsonObject(source: string, marker: string) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return null
  const start = source.indexOf('{', markerIndex + marker.length)
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return source.slice(start, index + 1)
  }
  return null
}

function chapterTime(value: string): number | null {
  const pieces = value.split(':').map(Number)
  if (pieces.some((piece) => !Number.isFinite(piece))) return null
  return pieces.reduce((total, piece) => total * 60 + piece, 0)
}

function descriptionChapters(description = ''): Chapter[] {
  const chapters = description.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/)
    const startSeconds = match ? chapterTime(match[1]) : null
    const label = match ? match[2].trim().slice(0, 240) : ''
    return match && startSeconds !== null && label ? [{startSeconds, label}] : []
  })
  return chapters.length >= 2 ? chapters : []
}

function cuesToChunks(cues: Cue[]) {
  const chunks: Array<{_key: string; _type: 'object'; startSeconds: number; text: string}> = []
  let current: {startSeconds: number; text: string} | null = null
  for (const cue of cues) {
    if (!current || cue.startSeconds - current.startSeconds >= 30 || current.text.length + cue.text.length > 650) {
      if (current) chunks.push({...current, _key: `chunk-${current.startSeconds}`, _type: 'object'})
      current = {...cue}
    } else {
      current.text = `${current.text} ${cue.text}`.slice(0, 1200)
    }
  }
  if (current) chunks.push({...current, _key: `chunk-${current.startSeconds}`, _type: 'object'})
  return chunks
}

function parseVttTimestamp(timestamp: string): number | null {
  const parts = timestamp.trim().split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseFloat(parts[2])
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null
    return Math.floor(hours * 3600 + minutes * 60 + seconds)
  }
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseFloat(parts[1])
    if (isNaN(minutes) || isNaN(seconds)) return null
    return Math.floor(minutes * 60 + seconds)
  }
  return null
}

function parseWebVtt(vttContent: string): Cue[] {
  const lines = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: Cue[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (line.includes('-->')) {
      const match = line.match(/((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?)\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d{1,3})?)/)
      if (match) {
        const startSeconds = parseVttTimestamp(match[1])
        i += 1
        const textLines: string[] = []
        while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
          const cleaned = lines[i].replace(/<[^>]+>/g, '').trim()
          if (cleaned) textLines.push(cleaned)
          i += 1
        }
        const text = textLines.join(' ').replace(/\s+/g, ' ').trim()
        if (text && startSeconds !== null && startSeconds >= 0) {
          cues.push({startSeconds, text})
        }
        continue
      }
    }
    i += 1
  }
  return cues
}

function transcriptChunksFromEvents(events: CaptionEvent[]) {
  const cues = events.flatMap((event) => {
    const text = event.segs?.map((segment) => segment.utf8 ?? '').join('').replace(/\s+/g, ' ').trim()
    return text && typeof event.tStartMs === 'number' ? [{startSeconds: Math.max(0, Math.floor(event.tStartMs / 1000)), text}] : []
  })
  return cuesToChunks(cues)
}

async function fetchCaptionsWithYtDlp(videoUrl: string): Promise<CaptionEvent[]> {
  const directory = await mkdtemp(join(tmpdir(), 'lopsis-ytdlp-'))
  try {
    try {
      await execFileAsync('yt-dlp', [
        '--skip-download',
        '--write-auto-subs',
        '--write-subs',
        '--sub-langs',
        'en-orig,en,en-US,en-GB,en.*',
        '--sub-format',
        'json3',
        '--no-warnings',
        '--quiet',
        '-o',
        join(directory, 'captions.%(ext)s'),
        videoUrl,
      ], {maxBuffer: 2_000_000})
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('yt-dlp is required when YouTube blocks direct caption downloads')
      }
      // If yt-dlp errored on secondary or auto-translated subs, continue to check if a primary sub was downloaded
    }

    const allFiles = await readdir(directory)
    const jsonFiles = allFiles.filter((file) => file.endsWith('.json3')).sort((left, right) => {
      const leftScore = left.includes('en-orig') ? 4 : left.includes('.en.') ? 3 : left.includes('en-US') ? 2 : left.includes('en-GB') ? 1 : 0
      const rightScore = right.includes('en-orig') ? 4 : right.includes('.en.') ? 3 : right.includes('en-US') ? 2 : right.includes('en-GB') ? 1 : 0
      return rightScore - leftScore
    })

    if (!jsonFiles[0]) return []
    const payload = JSON.parse(await readFile(join(directory, jsonFiles[0]), 'utf8')) as {events?: CaptionEvent[]}
    return payload.events ?? []
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
}

async function fetchYouTube(parsed: ParsedVideoSource, retries = 2): Promise<ExtractedVideo | null> {
  let watchResponse: Response
  try {
    watchResponse = await fetch(`https://www.youtube.com/watch?v=${parsed.providerId}`, {
      headers: {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'},
    })
  } catch (error) {
    if (retries > 0) {
      await sleep(1500)
      return fetchYouTube(parsed, retries - 1)
    }
    throw error
  }

  if (watchResponse.status === 429 && retries > 0) {
    await sleep(2500)
    return fetchYouTube(parsed, retries - 1)
  }
  if (!watchResponse.ok) throw new Error(`YouTube returned ${watchResponse.status}`)

  const html = await watchResponse.text()
  const raw = extractJsonObject(html, 'ytInitialPlayerResponse')
  let title: string | undefined
  let chapters: Chapter[] = []
  let directEvents: CaptionEvent[] = []

  if (raw) {
    try {
      const player = JSON.parse(raw) as PlayerResponse
      title = player.videoDetails?.title

      const renderedChapters = player.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap?.flatMap((map) => map.value?.chapters ?? []).flatMap((chapter) => {
        const renderer = chapter.chapterRenderer
        return renderer?.title?.simpleText && typeof renderer.timeRangeStartMillis === 'number'
          ? [{startSeconds: Math.floor(renderer.timeRangeStartMillis / 1000), label: renderer.title.simpleText.trim().slice(0, 240)}]
          : []
      }) ?? []
      chapters = renderedChapters.length ? renderedChapters : descriptionChapters(player.videoDetails?.shortDescription)

      const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
      const track = tracks.find((c) => c.languageCode?.startsWith('en') && c.kind !== 'asr')
        ?? tracks.find((c) => c.languageCode?.startsWith('en'))
        ?? tracks[0]

      if (track?.baseUrl) {
        const captionsUrl = new URL(track.baseUrl)
        captionsUrl.searchParams.set('fmt', 'json3')
        const captionsRes = await fetch(captionsUrl)
        if (captionsRes.ok) {
          const captionText = await captionsRes.text()
          if (captionText.trim()) {
            directEvents = (JSON.parse(captionText) as {events?: CaptionEvent[]}).events ?? []
          }
        }
      }
    } catch {
      // In case of parsing errors, proceed to fallback
    }
  }

  const events = directEvents.length > 0 ? directEvents : await fetchCaptionsWithYtDlp(parsed.normalizedUrl)
  const chunks = transcriptChunksFromEvents(events)

  return {
    provider: 'youtube',
    providerId: parsed.providerId,
    normalizedUrl: parsed.normalizedUrl,
    title,
    chapters,
    chunks,
  }
}

async function fetchVimeo(parsed: ParsedVideoSource): Promise<ExtractedVideo | null> {
  const configUrl = `https://player.vimeo.com/video/${parsed.providerId}/config`
  const res = await fetch(configUrl, {
    headers: {'user-agent': 'Mozilla/5.0 (compatible; LopsisIngest/1.0)'},
  })
  if (!res.ok) {
    throw new Error(`Vimeo config returned ${res.status}`)
  }

  const data = await res.json()
  const title = data.video?.title
  const textTracks = (data.request?.text_tracks ?? []) as Array<{
    lang?: string
    url?: string
    kind?: string
  }>

  const track = textTracks.find((t) => t.lang?.startsWith('en') && t.url) ?? textTracks.find((t) => t.url)
  if (!track?.url) {
    return null
  }

  const vttRes = await fetch(track.url)
  if (!vttRes.ok) {
    throw new Error(`Vimeo subtitle download returned ${vttRes.status}`)
  }

  const vttText = await vttRes.text()
  const cues = parseWebVtt(vttText)
  const chunks = cuesToChunks(cues)
  const chapters: Chapter[] = []
  if (data.video?.description) {
    chapters.push(...descriptionChapters(data.video.description))
  }

  return {
    provider: 'vimeo',
    providerId: parsed.providerId,
    normalizedUrl: parsed.normalizedUrl,
    title,
    chapters,
    chunks,
  }
}

async function fetchBunny(parsed: ParsedVideoSource): Promise<ExtractedVideo | null> {
  // Bunny embeds: if captions track URL is configured, parse it
  return null
}

async function extractVideo(videoUrl: string): Promise<ExtractedVideo | null> {
  const parsed = parseVideoUrl(videoUrl)
  if (!parsed) return null

  switch (parsed.provider) {
    case 'youtube':
      return fetchYouTube(parsed)
    case 'vimeo':
      return fetchVimeo(parsed)
    case 'bunny':
      return fetchBunny(parsed)
    default:
      return null
  }
}

async function run() {
  const lessons = await client.fetch<Array<{_id: string; slug: string; videoUrl: string}>>(
    `*[_type == "lesson" && defined(videoUrl) && (!defined($slug) || slug.current == $slug)]{_id, "slug": slug.current, videoUrl}`,
    {slug: requestedSlug ?? null},
  )

  const existingUrls = (dryRun && !force)
    ? new Set<string>()
    : force
      ? new Set<string>()
      : new Set(await client.fetch<string[]>(`*[_type == "video"].url`))

  let written = 0
  let skipped = 0
  let cursor = 0

  async function processLessons() {
    while (cursor < lessons.length) {
      const index = cursor
      cursor += 1
      const lesson = lessons[index]
      try {
        if (!force && existingUrls.has(lesson.videoUrl)) {
          console.log(`Already ingested ${lesson.slug}`)
          continue
        }

        const extracted = await extractVideo(lesson.videoUrl)
        if (!extracted?.chunks.length) {
          skipped += 1
          console.warn(`Skipped ${lesson.slug}: no accessible captions`)
          continue
        }

        const suffix = createHash('sha256').update(extracted.normalizedUrl).digest('hex').slice(0, 20)
        const safeId = extracted.providerId.replace(/[^a-zA-Z0-9_-]/g, '')
        const document = {
          _id: `video.${extracted.provider}.v${safeId}.${suffix}`,
          _type: 'video',
          providerId: extracted.providerId,
          url: extracted.normalizedUrl,
          sourceTitle: extracted.title,
          chapters: extracted.chapters.map((chapter) => ({
            ...chapter,
            _type: 'object',
            _key: `chapter-${chapter.startSeconds}`,
          })),
          chunks: extracted.chunks,
          ingestedAt: new Date().toISOString(),
        }

        if (!dryRun) {
          await client.createOrReplace(document)
        }
        written += 1
        console.log(`${dryRun ? 'Would write' : 'Wrote'} ${lesson.slug}: ${document.chapters.length} chapters, ${document.chunks.length} chunks`)

        // Modest delay between downloads to be polite to provider APIs
        await sleep(300)
      } catch (error) {
        skipped += 1
        console.warn(`Skipped ${lesson.slug}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
  }

  const workerCount = Math.min(concurrency, lessons.length)
  await Promise.all(Array.from({length: workerCount}, () => processLessons()))
  console.log(`Complete: ${written} ${dryRun ? 'ready' : 'written'}, ${skipped} skipped`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
