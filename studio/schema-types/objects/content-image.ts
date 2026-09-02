import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

export const contentImage = defineType({
  name: 'contentImage',
  title: 'Image',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Describe the image for learners who cannot see it.',
      validation: (rule) => rule.required().min(3),
    }),
  ],
})
