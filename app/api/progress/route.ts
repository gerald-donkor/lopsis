import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

import { ANALYTICS_EVENTS } from '@/lib/analytics/events'
import { captureProgressEvent } from '@/lib/posthog-server'
import type { ProgressRecord } from '@/lib/progress/types'
import { writeClient } from '@/sanity/lib/write-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const toggleCompleteSchema = z.object({
  action: z.literal('toggle_complete'),
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  completed: z.boolean().optional(),
  completionSource: z.enum(['manual', 'video_ended']).optional(),
})

const savePositionSchema = z.object({
  action: z.literal('save_position'),
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  positionSeconds: z.number().min(0),
})

const recordResumeSchema = z.object({
  action: z.literal('record_resume'),
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  resumePositionSeconds: z.number().min(0),
})

const progressPayloadSchema = z.discriminatedUnion('action', [
  toggleCompleteSchema,
  savePositionSchema,
  recordResumeSchema,
])

function getProgressDocId(userId: string, courseId: string): string {
  const cleanUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const cleanCourse = courseId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `progress.${cleanUser}.${cleanCourse}`.slice(0, 128)
}

const PROGRESS_RECORD_PROJECTION = /* groq */ `
  _id,
  userId,
  "courseId": course._ref,
  "courseSlug": course->slug.current,
  "completedLessonIds": coalesce(completedLessons[]._ref, []),
  "lastLessonId": lastLesson._ref,
  "lastLessonSlug": lastLesson->slug.current,
  lastPositionSeconds,
  lastUpdated
`

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const records = await writeClient.fetch<ProgressRecord[]>(
      `*[_type == "progress" && userId == $userId] | order(lastUpdated desc) {
        ${PROGRESS_RECORD_PROJECTION}
      }`,
      { userId },
    )

    return NextResponse.json({ records: records || [] })
  } catch (error) {
    console.error('Error fetching progress records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress records' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      )
    }

    const payload = progressPayloadSchema.parse(rawBody)

    const docId = getProgressDocId(userId, payload.courseId)
    const now = new Date().toISOString()

    // Ensure document exists
    await writeClient.createIfNotExists({
      _id: docId,
      _type: 'progress',
      userId,
      course: { _type: 'reference', _ref: payload.courseId },
      completedLessons: [],
      lastUpdated: now,
    })

    if (payload.action === 'toggle_complete') {
      const maxRetries = 3
      let shouldComplete = false

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const existing = await writeClient.fetch<{
          _rev?: string
          completedLessons?: Array<{ _ref: string; _key?: string }>
        }>(`*[_type == "progress" && _id == $docId][0] { _rev, completedLessons }`, {
          docId,
        })

        const existingMembers = existing?.completedLessons || []
        const isAlreadyCompleted = existingMembers.some(
          (item) => item._ref === payload.lessonId,
        )

        shouldComplete =
          payload.completed !== undefined ? payload.completed : !isAlreadyCompleted

        let updatedMembers: Array<{ _type: 'reference'; _ref: string; _key: string }>

        if (shouldComplete) {
          if (!isAlreadyCompleted) {
            const safeKey = payload.lessonId.replace(/[^a-zA-Z0-9_-]/g, '_')
            updatedMembers = [
              ...existingMembers.map((item, idx) => ({
                _type: 'reference' as const,
                _ref: item._ref,
                _key: item._key || `k_${idx}_${item._ref}`,
              })),
              {
                _type: 'reference' as const,
                _ref: payload.lessonId,
                _key: `complete_${safeKey}`,
              },
            ]
          } else {
            updatedMembers = existingMembers.map((item, idx) => ({
              _type: 'reference' as const,
              _ref: item._ref,
              _key: item._key || `k_${idx}_${item._ref}`,
            }))
          }
        } else {
          updatedMembers = existingMembers
            .filter((item) => item._ref !== payload.lessonId)
            .map((item, idx) => ({
              _type: 'reference' as const,
              _ref: item._ref,
              _key: item._key || `k_${idx}_${item._ref}`,
            }))
        }

        try {
          let patch = writeClient.patch(docId)
          if (existing?._rev) {
            patch = patch.ifRevisionId(existing._rev)
          }
          await patch
            .set({
              completedLessons: updatedMembers,
              lastUpdated: new Date().toISOString(),
            })
            .commit()
          break
        } catch (patchError) {
          if (attempt === maxRetries - 1) {
            throw patchError
          }
        }
      }

      if (shouldComplete) {
        await captureProgressEvent(request, {
          event: ANALYTICS_EVENTS.lessonCompleted,
          properties: {
            course_id: payload.courseId,
            lesson_id: payload.lessonId,
            completion_source: payload.completionSource ?? 'manual',
          },
        })
      }
    } else if (payload.action === 'save_position') {
      await writeClient
        .patch(docId)
        .set({
          lastLesson: { _type: 'reference', _ref: payload.lessonId },
          lastPositionSeconds: Math.max(0, Math.floor(payload.positionSeconds)),
          lastUpdated: now,
        })
        .commit()
    } else if (payload.action === 'record_resume') {
      await writeClient
        .patch(docId)
        .set({
          lastLesson: { _type: 'reference', _ref: payload.lessonId },
          lastPositionSeconds: Math.max(
            0,
            Math.floor(payload.resumePositionSeconds),
          ),
          lastUpdated: now,
        })
        .commit()

      await captureProgressEvent(request, {
        event: ANALYTICS_EVENTS.resumeUsed,
        properties: {
          course_id: payload.courseId,
          lesson_id: payload.lessonId,
          resume_position_seconds: Math.max(
            0,
            Math.floor(payload.resumePositionSeconds),
          ),
        },
      })
    }

    const updatedRecord = await writeClient.fetch<ProgressRecord>(
      `*[_type == "progress" && _id == $docId][0] {
        ${PROGRESS_RECORD_PROJECTION}
      }`,
      { docId },
    )

    return NextResponse.json({
      success: true,
      record: updatedRecord,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error handling progress mutation:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 },
    )
  }
}
