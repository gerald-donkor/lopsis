import 'server-only'

import {sanityFetch} from '../lib/fetch'
import {
  INSTRUCTOR_BY_SLUG_QUERY,
  INSTRUCTORS_QUERY,
} from '../queries/instructors'
import {requireSlug} from './slug'

export function getInstructors() {
  return sanityFetch({query: INSTRUCTORS_QUERY, tags: ['instructor', 'course']})
}

export function getInstructorBySlug(slug: string) {
  const normalizedSlug = requireSlug(slug)

  return sanityFetch({
    query: INSTRUCTOR_BY_SLUG_QUERY,
    params: {slug: normalizedSlug},
    tags: [`instructor:${normalizedSlug}`, 'course', 'category'],
  })
}
