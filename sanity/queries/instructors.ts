import {defineQuery} from 'next-sanity'

import {COURSE_CARD_FRAGMENT, IMAGE_FRAGMENT} from './fragments'

export const INSTRUCTORS_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    expertise,
    photo { ${IMAGE_FRAGMENT} },
    "courseCount": count(*[
      _type == "course" &&
      instructor._ref == ^._id &&
      defined(slug.current)
    ])
  }
`)

export const INSTRUCTOR_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    expertise,
    bio,
    photo { ${IMAGE_FRAGMENT} },
    "courses": *[
      _type == "course" &&
      instructor._ref == ^._id &&
      defined(slug.current)
    ] | order(popular desc, title asc) {
      ${COURSE_CARD_FRAGMENT}
    }
  }
`)
