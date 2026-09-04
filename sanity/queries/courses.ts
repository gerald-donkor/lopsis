import {defineQuery} from 'next-sanity'

import {COURSE_CARD_FRAGMENT, LESSON_SUMMARY_FRAGMENT} from './fragments'

export const COURSES_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)]
  | order(popular desc, title asc) {
    ${COURSE_CARD_FRAGMENT}
  }
`)

export const COURSE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && slug.current == $slug][0] {
    ${COURSE_CARD_FRAGMENT},
    learningOutcomes[] {
      _key,
      title,
      description,
      icon
    },
    modules[] {
      _key,
      title,
      summary,
      lessons[]->{
        ${LESSON_SUMMARY_FRAGMENT}
      }
    }
  }
`)
