import {PlayIcon} from '@sanity/icons/Play'
import {defineArrayMember, defineField, defineType} from 'sanity'

const timestampedText = defineArrayMember({
  type: 'object',
  fields: [
    defineField({
      name: 'startSeconds',
      type: 'number',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().min(1).max(1200),
    }),
  ],
  preview: {
    select: {title: 'text', startSeconds: 'startSeconds'},
    prepare({title, startSeconds}) {
      return {title, subtitle: `${startSeconds ?? 0}s`}
    },
  },
})

export const video = defineType({
  name: 'video',
  title: 'Video intelligence',
  type: 'document',
  icon: PlayIcon,
  fields: [
    defineField({name: 'providerId', title: 'Provider ID', type: 'string', readOnly: true, validation: (rule) => rule.required()}),
    defineField({name: 'url', title: 'Canonical video URL', type: 'url', readOnly: true, validation: (rule) => rule.required().uri({scheme: ['https']})}),
    defineField({name: 'sourceTitle', title: 'Source title', type: 'string', readOnly: true}),
    defineField({
      name: 'chapters',
      title: 'Table of contents',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({name: 'startSeconds', type: 'number', validation: (rule) => rule.required().integer().min(0)}),
          defineField({name: 'label', type: 'string', validation: (rule) => rule.required().min(1).max(240)}),
        ],
        preview: {select: {title: 'label', startSeconds: 'startSeconds'}, prepare({title, startSeconds}) { return {title, subtitle: `${startSeconds ?? 0}s`} }},
      })],
    }),
    defineField({name: 'chunks', title: 'Transcript chunks', type: 'array', of: [timestampedText]}),
    defineField({name: 'ingestedAt', title: 'Ingested at', type: 'datetime', readOnly: true, validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'sourceTitle', subtitle: 'providerId'}},
})
