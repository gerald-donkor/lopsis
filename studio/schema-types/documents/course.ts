import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const course = defineType({
  name: 'course',
  title: 'Course',
  type: 'document',
  icon: BookIcon,
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
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required().min(20).max(500),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'contentImage',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'icon',
      title: 'Course icon',
      type: 'contentImage',
      description: 'Optional compact identity used in search and course labels.',
    }),
    defineField({
      name: 'level',
      title: 'Level',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Beginner', value: 'beginner'},
          {title: 'Intermediate', value: 'intermediate'},
          {title: 'Advanced', value: 'advanced'},
          {title: 'All levels', value: 'all-levels'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (rule) => rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'popular',
      title: 'Popular course',
      type: 'boolean',
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
      name: 'learningOutcomes',
      title: 'Learning outcomes',
      type: 'array',
      of: [defineArrayMember({type: 'learningOutcome'})],
      validation: (rule) => rule.required().min(1).max(8),
    }),
    defineField({
      name: 'instructor',
      title: 'Instructor',
      type: 'reference',
      to: [{type: 'instructor'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'modules',
      title: 'Modules',
      type: 'array',
      description: 'Order modules and their lesson references to define the curriculum.',
      of: [defineArrayMember({type: 'courseModule'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      level: 'level',
      category: 'category.title',
      media: 'coverImage',
    },
    prepare({title, level, category, media}) {
      return {
        title,
        subtitle: [category, level].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
