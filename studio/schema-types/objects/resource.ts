import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

export const lessonResource = defineType({
  name: 'lessonResource',
  title: 'Resource',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Article', value: 'article'},
          {title: 'Download', value: 'download'},
          {title: 'Template', value: 'template'},
          {title: 'External link', value: 'link'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(120),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required().min(5).max(240),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required().uri({scheme: ['https']}),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'type'}},
})
