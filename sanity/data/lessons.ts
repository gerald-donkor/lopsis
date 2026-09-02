import 'server-only'

import {sanityFetch} from '../lib/fetch'
import {LESSON_BY_SLUG_QUERY} from '../queries/lessons'
import {requireSlug} from './slug'

export async function getLessonBySlug(slug: string) {
  const normalizedSlug = requireSlug(slug)
  const lesson = await sanityFetch({
    query: LESSON_BY_SLUG_QUERY,
    params: {slug: normalizedSlug},
    tags: [`lesson:${normalizedSlug}`, 'course', 'instructor'],
  })

  if (!lesson) return null

  const modules = lesson.course?.modules ?? []
  const moduleIndex = modules.findIndex((module) =>
    module.lessons?.some((candidate) => candidate._id === lesson._id),
  )
  const matchedModule = moduleIndex >= 0 ? modules[moduleIndex] : null
  const lessonIndex =
    matchedModule?.lessons?.findIndex(
      (candidate) => candidate._id === lesson._id,
    ) ?? -1

  return {
    ...lesson,
    module:
      matchedModule && lessonIndex >= 0
        ? {
            ...matchedModule,
            moduleIndex,
            lessonIndex,
            moduleNumber: moduleIndex + 1,
            lessonNumber: lessonIndex + 1,
          }
        : null,
  }
}
