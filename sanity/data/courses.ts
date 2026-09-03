import 'server-only'

import {sanityFetch} from '../lib/fetch'
import {COURSE_BY_SLUG_QUERY, COURSES_QUERY} from '../queries/courses'
import {requireSlug} from './slug'

export function getCourses() {
  return sanityFetch({
    query: COURSES_QUERY,
    tags: ['course', 'lesson', 'instructor', 'category'],
  })
}

export function getCourseBySlug(slug: string) {
  const normalizedSlug = requireSlug(slug)

  return sanityFetch({
    query: COURSE_BY_SLUG_QUERY,
    params: {slug: normalizedSlug},
    tags: [
      `course:${normalizedSlug}`,
      'lesson',
      'instructor',
      'category',
    ],
  })
}
