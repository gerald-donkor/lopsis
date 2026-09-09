import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const progress = defineType({
  name: 'progress',
  title: 'Learner progress',
  type: 'document',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'userId',
      title: 'Clerk User ID',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'course',
      title: 'Course',
      type: 'reference',
      to: [{type: 'course'}],
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'completedLessons',
      title: 'Completed lessons',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'lesson'}],
        }),
      ],
    }),
    defineField({
      name: 'lastLesson',
      title: 'Last lesson',
      type: 'reference',
      to: [{type: 'lesson'}],
    }),
    defineField({
      name: 'lastPositionSeconds',
      title: 'Last watch position (seconds)',
      type: 'number',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      courseTitle: 'course.title',
      userId: 'userId',
      lastUpdated: 'lastUpdated',
    },
    /** Builds the title and subtitle shown for a progress document in Studio. */
    prepare({courseTitle, userId, lastUpdated}) {
      return {
        title: courseTitle || 'Untitled Course Progress',
        subtitle: `${userId || 'Anonymous'} • ${lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'No updates'}`,
      }
    },
  },
})
