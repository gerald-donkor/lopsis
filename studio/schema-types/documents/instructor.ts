import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

export const instructor = defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'contentImage',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'expertise',
      title: 'Expertise',
      type: 'array',
      of: [{type: 'string'}],
      description: 'Topics or skills the instructor specializes in.',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'portableText',
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'name', expertise: 'expertise', media: 'photo'},
    prepare({title, expertise, media}) {
      const subtitle = Array.isArray(expertise) ? expertise.join(' · ') : expertise
      return {title, subtitle, media}
    },
  },
})
