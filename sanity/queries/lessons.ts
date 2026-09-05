import {defineQuery} from 'next-sanity'

import {IMAGE_FRAGMENT} from './fragments'

export const LESSON_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    videoUrl,
    poster { ${IMAGE_FRAGMENT} },
    durationSeconds,
    "freePreview": coalesce(freePreview, false),
    "studentCount": coalesce(studentCount, 0),
    notes,
    keyPoints,
    proTip,
    resources[] {
      _key,
      type,
      title,
      description,
      url
    },
    "course": *[
      _type == "course" &&
      defined(slug.current) &&
      references(^._id)
    ][0] {
      _id,
      title,
      "slug": slug.current,
      level,
      icon { ${IMAGE_FRAGMENT} },
      instructor->{
        _id,
        name,
        "slug": slug.current,
        expertise,
        photo { ${IMAGE_FRAGMENT} }
      },
      modules[] {
        _key,
        title,
        summary,
        lessons[]->{
          _id,
          title,
          "slug": slug.current,
          durationSeconds,
          "freePreview": coalesce(freePreview, false)
        }
      }
    }
  }
`)
