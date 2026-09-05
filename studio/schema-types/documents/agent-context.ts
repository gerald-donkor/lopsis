import {SearchIcon} from '@sanity/icons/Search'
import {defineField, defineType} from 'sanity'

// @sanity/context currently requires Sanity 6. This compatible local schema
// exposes the Context document while Lopsis remains on Sanity 5.
export const agentContext = defineType({
  name: 'sanity.agentContext',
  title: 'Agent context',
  type: 'document',
  icon: SearchIcon,
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'slug', title: 'Slug', type: 'slug', options: {source: 'name'}, validation: (rule) => rule.required()}),
    defineField({name: 'groqFilter', title: 'Content filter', type: 'text', rows: 4, validation: (rule) => rule.required()}),
    defineField({name: 'instructions', title: 'Instructions', type: 'text', rows: 18, validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'slug.current'}},
})
