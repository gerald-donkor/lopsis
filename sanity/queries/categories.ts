import {defineQuery} from 'next-sanity'

import {COURSE_CARD_FRAGMENT} from './fragments'

export const CATEGORIES_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    "courseCount": count(*[
      _type == "course" &&
      category._ref == ^._id &&
      defined(slug.current)
    ])
  }
`)

export const CATEGORY_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    description,
    "courses": *[
      _type == "course" &&
      category._ref == ^._id &&
      defined(slug.current)
    ] | order(popular desc, title asc) {
      ${COURSE_CARD_FRAGMENT}
    }
  }
`)
