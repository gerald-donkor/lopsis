import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {promisify} from 'node:util'
import {getCliClient} from 'sanity/cli'

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
const requestedSlug = process.argv.find((arg) => arg.startsWith('--slug='))?.slice('--slug='.length) || process.env.LOPSIS_INGEST_SLUG

function extractJsonObject(source: string, marker: string) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return null
  const start = source.indexOf('{', markerIndex + marker.length)
  if (start < 0) return null
  let depth = 0
  let string = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (string) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') string = false
      continue
    }
    if (character === '"') string = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return source.slice(start, index + 1)
  }
  return null
}

function youtubeId(videoUrl: string) {
  const url = new URL(videoUrl)
  const host = url.hostname.replace(/^www\./, '')
  if (url.protocol !== 'https:') return null
  const id = host === 'youtu.be' ? url.pathname.slice(1) : host.endsWith('youtube.com') ? url.searchParams.get('v') : null
  return id && /^[\w-]{6,}$/.test(id) ? id : null
}

function chapterTime(value: string) {
  const pieces = value.split(':').map(Number)
  if (pieces.some((piece) => !Number.isFinite(piece))) return null
  return pieces.reduce((total, piece) => total * 60 + piece, 0)
}

function descriptionChapters(description = '') {
  const chapters = description.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/)
    const startSeconds = match ? chapterTime(match[1]) : null
    return match && startSeconds !== null ? [{startSeconds, label: match[2]}] : []
  })
  return chapters.length >= 2 ? chapters : []
}

function transcriptChunks(events: CaptionEvent[]) {
  const cues = events.flatMap((event) => {
    const text = event.segs?.map((segment) => segment.utf8 ?? '').join('').replace(/\s+/g, ' ').trim()
    return text && typeof event.tStartMs === 'number' ? [{startSeconds: Math.max(0, Math.floor(event.tStartMs / 1000)), text}] : []
  })
  const chunks: Array<{_key: string; _type: 'object'; startSeconds: number; text: string}> = []
  let current: {startSeconds: number; text: string} | null = null
  for (const cue of cues) {
    if (!current || cue.startSeconds - current.startSeconds >= 30 || current.text.length + cue.text.length > 650) {
      if (current) chunks.push({...current, _key: `chunk-${current.startSeconds}`, _type: 'object'})
      current = {...cue}
    } else current.text = `${current.text} ${cue.text}`
  }
  if (current) chunks.push({...current, _key: `chunk-${current.startSeconds}`, _type: 'object'})
  return chunks
}

async function fetchCaptionsWithYtDlp(videoUrl: string) {
  const directory = await mkdtemp(join(tmpdir(), 'lopsis-ytdlp-'))
  try {
    await execFileAsync('yt-dlp', [
      '--skip-download',
      '--write-auto-subs',
      '--write-subs',
      '--sub-langs',
      'en-orig,en',
      '--sub-format',
      'json3',
      '--no-warnings',
      '--quiet',
      '-o',
      join(directory, 'captions.%(ext)s'),
      videoUrl,
    ], {maxBuffer: 2_000_000})
    const files = (await readdir(directory)).filter((file) => file.endsWith('.json3')).sort((left, right) => Number(right.includes('en-orig')) - Number(left.includes('en-orig')))
    if (!files[0]) return []
    const payload = JSON.parse(await readFile(join(directory, files[0]), 'utf8')) as {events?: CaptionEvent[]}
    return payload.events ?? []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('yt-dlp is required when YouTube blocks direct caption downloads')
    throw error
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
}

async function fetchVideo(videoUrl: string) {
  const id = youtubeId(videoUrl)
  if (!id) return null
  const watch = await fetch(`https://www.youtube.com/watch?v=${id}`, {headers: {'user-agent': 'Mozilla/5.0 (compatible; LopsisIngest/1.0)'}})
  if (!watch.ok) throw new Error(`YouTube returned ${watch.status}`)
  const html = await watch.text()
  const raw = extractJsonObject(html, 'ytInitialPlayerResponse')
  if (!raw) throw new Error('YouTube player data was unavailable')
  const player = JSON.parse(raw) as PlayerResponse
  const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  const track = tracks.find((candidate) => candidate.languageCode?.startsWith('en') && candidate.kind !== 'asr') ?? tracks.find((candidate) => candidate.languageCode?.startsWith('en')) ?? tracks[0]
  if (!track?.baseUrl) return null
  const captionsUrl = new URL(track.baseUrl)
  captionsUrl.searchParams.set('fmt', 'json3')
  const captions = await fetch(captionsUrl)
  if (!captions.ok) throw new Error(`Caption download returned ${captions.status}`)
  const captionText = await captions.text()
  const events = captionText.trim()
    ? (JSON.parse(captionText) as {events?: CaptionEvent[]}).events ?? []
    : await fetchCaptionsWithYtDlp(videoUrl)
  const renderedChapters = player.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap?.flatMap((map) => map.value?.chapters ?? []).flatMap((chapter) => {
    const renderer = chapter.chapterRenderer
    return renderer?.title?.simpleText && typeof renderer.timeRangeStartMillis === 'number' ? [{startSeconds: Math.floor(renderer.timeRangeStartMillis / 1000), label: renderer.title.simpleText}] : []
  }) ?? []
  const chapters = renderedChapters.length ? renderedChapters : descriptionChapters(player.videoDetails?.shortDescription)
  return {id, title: player.videoDetails?.title, chapters, chunks: transcriptChunks(events)}
}

async function run() {
  const lessons = await client.fetch<Array<{_id: string; slug: string; videoUrl: string}>>(
    `*[_type == "lesson" && defined(videoUrl) && (!defined($slug) || slug.current == $slug)]{_id, "slug": slug.current, videoUrl}`,
    {slug: requestedSlug ?? null},
  )
  const existingUrls = dryRun ? new Set<string>() : new Set(await client.fetch<string[]>(`*[_type == "video"].url`))
  let written = 0
  let skipped = 0
  let cursor = 0

  async function processLessons() {
    while (cursor < lessons.length) {
      const index = cursor
      cursor += 1
      const lesson = lessons[index]
      try {
        if (existingUrls.has(lesson.videoUrl)) {
          console.log(`Already ingested ${lesson.slug}`)
          continue
        }
        const extracted = await fetchVideo(lesson.videoUrl)
        if (!extracted?.chunks.length) {
          skipped += 1
          console.warn(`Skipped ${lesson.slug}: no accessible captions`)
          continue
        }
        const normalizedUrl = `https://www.youtube.com/watch?v=${extracted.id}`
        const suffix = createHash('sha256').update(normalizedUrl).digest('hex').slice(0, 20)
        const document = {
          _id: `video.youtube.v${extracted.id.replace(/[^a-zA-Z0-9_-]/g, '')}.${suffix}`,
          _type: 'video',
          providerId: extracted.id,
          url: normalizedUrl,
          sourceTitle: extracted.title,
          chapters: extracted.chapters.map((chapter) => ({...chapter, _type: 'object', _key: `chapter-${chapter.startSeconds}`})),
          chunks: extracted.chunks,
          ingestedAt: new Date().toISOString(),
        }
        if (!dryRun) await client.createOrReplace(document)
        written += 1
        console.log(`${dryRun ? 'Would write' : 'Wrote'} ${lesson.slug}: ${document.chapters.length} chapters, ${document.chunks.length} chunks`)
      } catch (error) {
        skipped += 1
        console.warn(`Skipped ${lesson.slug}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }
  }

  await Promise.all(Array.from({length: Math.min(4, lessons.length)}, () => processLessons()))
  console.log(`Complete: ${written} ${dryRun ? 'ready' : 'written'}, ${skipped} skipped`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
