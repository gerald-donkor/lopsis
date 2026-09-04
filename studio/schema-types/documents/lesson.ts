import {PlayIcon} from '@sanity/icons/Play'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(140),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'Use the canonical HTTPS URL for the lesson video.',
      validation: (rule) => rule.required().uri({scheme: ['https']}),
    }),
    defineField({
      name: 'poster',
      title: 'Poster or thumbnail',
      type: 'contentImage',
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail image',
      type: 'contentImage',
      hidden: true,
    }),
    defineField({
      name: 'durationSeconds',
      title: 'Duration (seconds)',
      type: 'number',
      validation: (rule) => rule.integer().positive(),
    }),
    defineField({
      name: 'duration',
      title: 'Duration (legacy)',
      type: 'number',
      hidden: true,
    }),
    defineField({
      name: 'freePreview',
      title: 'Free preview',
      type: 'boolean',
      description: 'Presentational label only; this does not control access.',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      title: 'Student count',
      type: 'number',
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'portableText',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key points',
      type: 'array',
      description: 'A short list for the “In this lesson” section.',
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().min(3).max(180),
        }),
      ],
      validation: (rule) => rule.max(8).unique(),
    }),
    defineField({
      name: 'proTip',
      title: 'Pro tip',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      of: [
        defineArrayMember({type: 'lessonResource'}),
        defineArrayMember({type: 'resource'}),
      ],
      validation: (rule) => rule.max(12),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      durationSeconds: 'durationSeconds',
      duration: 'duration',
      poster: 'poster',
      thumbnail: 'thumbnail',
    },
    prepare({title, durationSeconds, duration, poster, thumbnail}) {
      const sec = durationSeconds ?? duration
      const minutes = sec ? Math.ceil(sec / 60) : 0
      return {title, subtitle: `${minutes} min`, media: poster ?? thumbnail}
    },
  },
})
