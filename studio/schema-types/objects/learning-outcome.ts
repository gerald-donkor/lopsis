import {TargetIcon} from '@sanity/icons/Target'
import {defineField, defineType} from 'sanity'

export const learningOutcome = defineType({
  name: 'learningOutcome',
  title: 'Learning outcome',
  type: 'object',
  icon: TargetIcon,
  fields: [
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'contentImage',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(80),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().min(10).max(240),
    }),
  ],
  preview: {select: {title: 'title', media: 'icon'}},
})
