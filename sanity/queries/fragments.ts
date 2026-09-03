export const IMAGE_FRAGMENT = /* groq */ `
  asset->{
    _id,
    url,
    metadata {
      lqip,
      dimensions {
        width,
        height,
        aspectRatio
      }
    }
  },
  alt,
  crop,
  hotspot
`

export const COURSE_CARD_FRAGMENT = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  summary,
  coverImage { ${IMAGE_FRAGMENT} },
  icon { ${IMAGE_FRAGMENT} },
  level,
  price,
  "popular": coalesce(popular, false),
  "studentCount": coalesce(studentCount, 0),
  category->{
    _id,
    title,
    "slug": slug.current
  },
  instructor->{
    _id,
    name,
    "slug": slug.current,
    expertise,
    photo { ${IMAGE_FRAGMENT} }
  },
  "moduleCount": count(modules),
  "lessonCount": count(modules[].lessons[])
`

export const LESSON_SUMMARY_FRAGMENT = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  poster { ${IMAGE_FRAGMENT} },
  durationSeconds,
  "freePreview": coalesce(freePreview, false),
  "studentCount": coalesce(studentCount, 0),
  keyPoints
`
