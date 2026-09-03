import 'server-only'

import {sanityFetch} from '../lib/fetch'
import {CATEGORIES_QUERY, CATEGORY_BY_SLUG_QUERY} from '../queries/categories'
import {requireSlug} from './slug'

export function getCategories() {
  return sanityFetch({query: CATEGORIES_QUERY, tags: ['category', 'course']})
}

export function getCategoryBySlug(slug: string) {
  const normalizedSlug = requireSlug(slug)

  return sanityFetch({
    query: CATEGORY_BY_SLUG_QUERY,
    params: {slug: normalizedSlug},
    tags: [`category:${normalizedSlug}`, 'course', 'instructor'],
  })
}
