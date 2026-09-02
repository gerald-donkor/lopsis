import {StackIcon} from '@sanity/icons/Stack'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const courseModule = defineType({
  name: 'courseModule',
  title: 'Module',
  type: 'object',
  icon: StackIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(3).max(120),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().min(10).max(320),
    }),
    defineField({
      name: 'lessons',
      title: 'Lessons',
      type: 'array',
      description: 'Order these references in the sequence learners should follow.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'lesson'}],
        }),
      ],
      validation: (rule) => rule.required().min(1).unique(),
    }),
  ],
  preview: {
    select: {title: 'title', lessons: 'lessons'},
    prepare({title, lessons}) {
      const count = Array.isArray(lessons) ? lessons.length : 0
      return {title, subtitle: `${count} ${count === 1 ? 'lesson' : 'lessons'}`}
    },
  },
})
