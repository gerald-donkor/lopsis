import 'server-only'

import type {SearchCandidate, SearchResult} from './schema'
import {client} from '@/sanity/lib/client'

type GroundedLesson = {
  _id: string
  title: string
  slug: string
  durationSeconds: number | null
  keyPoints: string[] | null
  description: string | null
  posterUrl: string | null
  course: {
    _id: string
    title: string
    slug: string
    iconUrl: string | null
    modules: Array<{title: string; lessonIds: string[]}>
  } | null
  video: {
    _id: string
    chapters: Array<{startSeconds: number; label: string}> | null
    chunks: Array<{startSeconds: number; text: string}> | null
  } | null
}

const GROUND_CANDIDATES_QUERY = `
  *[_type == "lesson" && _id in $lessonIds] {
    _id,
    title,
    "slug": slug.current,
    "durationSeconds": coalesce(durationSeconds, duration),
    keyPoints,
    "description": pt::text(notes),
    "posterUrl": coalesce(poster.asset->url, thumbnail.asset->url),
    "course": *[_type == "course" && references(^._id)][0] {
      _id,
      title,
      "slug": slug.current,
      "iconUrl": icon.asset->url,
      modules[] {title, "lessonIds": lessons[]._ref}
    },
    "video": *[_type == "video" && url == ^.videoUrl][0] {
      _id,
      chapters,
      "chunks": chunks[startSeconds in $startSeconds]
    }
  }
`

function compactDescription(value: string | null, fallback: string) {
  const text = value?.replace(/\s+/g, ' ').trim() || fallback
  return text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text
}

export async function groundSearchCandidates(candidates: SearchCandidate[], signal?: AbortSignal): Promise<SearchResult[]> {
  if (!candidates.length) return []
  const lessonIds = [...new Set(candidates.map((candidate) => candidate.lessonId))]
  const startSeconds = [...new Set(candidates.flatMap((candidate) => candidate.kind === 'video' ? [candidate.startSeconds] : []))]
  const lessons = await client.fetch<GroundedLesson[]>(GROUND_CANDIDATES_QUERY, {lessonIds, startSeconds}, {next: {revalidate: 3600, tags: ['lesson', 'course', 'video']}, signal})
  const lessonsById = new Map(lessons.map((lesson) => [lesson._id, lesson]))
  const seen = new Set<string>()
  const results: SearchResult[] = []

  for (const candidate of [...candidates].sort((a, b) => b.relevance - a.relevance)) {
    const lesson = lessonsById.get(candidate.lessonId)
    const course = lesson?.course
    if (!lesson?.slug || !course?.slug) continue
    const moduleIndex = course.modules.findIndex((courseModule) => courseModule.lessonIds.includes(lesson._id))
    const courseModule = course.modules[moduleIndex]
    const lessonIndex = courseModule?.lessonIds.indexOf(lesson._id) ?? -1
    if (!courseModule || moduleIndex < 0 || lessonIndex < 0) continue

    const base = {
      lessonSlug: lesson.slug,
      lessonTitle: lesson.title,
      courseId: course._id,
      courseSlug: course.slug,
      courseTitle: course.title,
      courseIconUrl: course.iconUrl,
      moduleTitle: courseModule.title,
      moduleNumber: moduleIndex + 1,
      lessonNumber: lessonIndex + 1,
      relevance: candidate.relevance,
    }

    if (candidate.kind === 'lesson') {
      const id = `lesson:${lesson._id}`
      if (seen.has(id)) continue
      seen.add(id)
      results.push({...base, id, kind: 'lesson', description: compactDescription(lesson.description, lesson.title), keyPoints: lesson.keyPoints ?? []})
      continue
    }

    if (lesson.video?._id !== candidate.videoId) continue
    const chapters = lesson.video.chapters ?? []
    const moment = candidate.matchSource === 'chapter'
      ? chapters.find((chapter) => chapter.startSeconds === candidate.startSeconds)
      : lesson.video.chunks?.find((chunk) => chunk.startSeconds === candidate.startSeconds)
    if (!moment) continue
    const id = `video:${lesson._id}:${candidate.startSeconds}`
    if (seen.has(id)) continue
    seen.add(id)
    const nextChapter = candidate.matchSource === 'chapter' ? chapters.find((chapter) => chapter.startSeconds > candidate.startSeconds) : null
    const remaining = Math.max(1, (lesson.durationSeconds ?? candidate.startSeconds + 30) - candidate.startSeconds)
    const clipLengthSeconds = Math.max(1, Math.min(remaining, nextChapter ? nextChapter.startSeconds - candidate.startSeconds : 30))
    const momentText = 'label' in moment ? moment.label : moment.text
    results.push({...base, id, kind: 'video', description: compactDescription(momentText, lesson.title), posterUrl: lesson.posterUrl, startSeconds: candidate.startSeconds, clipLengthSeconds, matchSource: candidate.matchSource})
  }

  return results
}
