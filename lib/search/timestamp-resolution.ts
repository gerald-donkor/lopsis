import {
  lessonSearchRowsSchema,
  searchCandidatesSchema,
  videoSearchRowsSchema,
  type SearchCandidate,
} from './schema'

export type VideoEmbed = { provider: 'YouTube' | 'Vimeo' | 'Bunny'; src: string }

export function createEmbedUrl(videoUrl: string, startSeconds: number): VideoEmbed | null {
  try {
    const url = new URL(videoUrl)
    if (url.protocol !== 'https:') return null
    const start = String(Math.max(0, Math.floor(startSeconds)))
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
      const id =
        host === 'youtu.be'
          ? url.pathname.slice(1)
          : url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop()
      if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null
      return {
        provider: 'YouTube',
        src: `https://www.youtube-nocookie.com/embed/${id}?start=${start}&rel=0&enablejsapi=1&playsinline=1`,
      }
    }

    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const id = url.pathname.split('/').find((part) => /^\d+$/.test(part))
      if (!id) return null
      return { provider: 'Vimeo', src: `https://player.vimeo.com/video/${id}#t=${start}s` }
    }

    if (host.endsWith('mediadelivery.net') || host.endsWith('b-cdn.net')) {
      const parts = url.pathname.split('/').filter(Boolean)
      const libraryId = parts.indexOf('embed') >= 0 ? parts[parts.indexOf('embed') + 1] : parts[0]
      const videoId = parts.indexOf('embed') >= 0 ? parts[parts.indexOf('embed') + 2] : parts[1]
      if (!libraryId || !videoId || !/^[\w-]+$/.test(libraryId) || !/^[\w-]+$/.test(videoId)) return null
      return {
        provider: 'Bunny',
        src: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?t=${start}&start=${start}`,
      }
    }
  } catch {
    return null
  }
  return null
}

export function lessonRelevance(row: ReturnType<typeof lessonSearchRowsSchema.parse>[number]) {
  if (row.exactTitleMatch) return 100
  if (row.titleMatch) return row.keyPointsMatch || row.notesMatch ? 94 : 90
  if (row.keyPointsMatch) return row.notesMatch ? 79 : 75
  return 60
}

export function candidatesFromRows(
  lessonRows: ReturnType<typeof lessonSearchRowsSchema.parse>,
  videoRows: ReturnType<typeof videoSearchRowsSchema.parse>,
): SearchCandidate[] {
  const candidates: SearchCandidate[] = lessonRows.map((row) => ({
    kind: 'lesson',
    lessonId: row.lessonId,
    relevance: lessonRelevance(row),
  }))

  for (const row of videoRows) {
    const moments = row.chapterMatches.length > 0 ? row.chapterMatches : row.chunkMatches
    const matchSource = row.chapterMatches.length > 0 ? ('chapter' as const) : ('chunk' as const)
    for (const lessonId of row.lessonIds) {
      for (const moment of moments) {
        candidates.push({
          kind: 'video',
          lessonId,
          videoId: row.videoId,
          startSeconds: moment.startSeconds,
          matchSource,
          relevance:
            matchSource === 'chapter' && 'exactLabelMatch' in moment
              ? moment.exactLabelMatch
                ? 98
                : 88
              : 70,
        })
      }
    }
  }

  return searchCandidatesSchema.parse({candidates}).candidates
}

export function formatResultHref(slug: string, kind: 'lesson' | 'video', startSeconds?: number) {
  return `/lessons/${encodeURIComponent(slug)}${kind === 'video' ? `?start=${startSeconds ?? 0}` : ''}`
}
