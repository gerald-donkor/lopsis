import assert from 'node:assert/strict'
import test from 'node:test'
import type { CourseProgressSummary, ProgressRecord } from './types'

/** Mirrors provider progress calculations for focused unit coverage. */
function calculateProgress(
  record: ProgressRecord | undefined,
  totalLessons?: number,
): CourseProgressSummary {
  const completedCount = record?.completedLessonIds?.length || 0
  const total = totalLessons !== undefined && totalLessons > 0 ? totalLessons : 0
  const percentage =
    total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0
  const isCompleted = total > 0 && completedCount >= total

  return {
    completedCount,
    totalLessons: totalLessons || undefined,
    percentage,
    isCompleted,
    lastLessonId: record?.lastLessonId,
    lastLessonSlug: record?.lastLessonSlug,
    lastPositionSeconds: record?.lastPositionSeconds,
  }
}

test('progress calculation: returns 0% when no lessons completed', () => {
  const summary = calculateProgress(undefined, 10)
  assert.equal(summary.completedCount, 0)
  assert.equal(summary.percentage, 0)
  assert.equal(summary.isCompleted, false)
})

test('progress calculation: calculates percentage and completion correctly', () => {
  const record: ProgressRecord = {
    _id: 'progress-user1-course1',
    userId: 'user1',
    courseId: 'course1',
    completedLessonIds: ['lesson-1', 'lesson-2'],
    lastLessonId: 'lesson-2',
    lastPositionSeconds: 154,
    lastUpdated: new Date().toISOString(),
  }

  const summary = calculateProgress(record, 4)
  assert.equal(summary.completedCount, 2)
  assert.equal(summary.percentage, 50)
  assert.equal(summary.isCompleted, false)
  assert.equal(summary.lastLessonId, 'lesson-2')
  assert.equal(summary.lastPositionSeconds, 154)

  const completedSummary = calculateProgress(record, 2)
  assert.equal(completedSummary.percentage, 100)
  assert.equal(completedSummary.isCompleted, true)
})

test('progress reconciliation: merging savePosition response preserves completedLessonIds', () => {
  const currentRecord: ProgressRecord = {
    _id: 'record-1',
    userId: 'user-1',
    courseId: 'course-1',
    completedLessonIds: ['lesson-1', 'lesson-2'],
    lastLessonId: 'lesson-1',
    lastPositionSeconds: 10,
    lastUpdated: '2026-09-07T12:00:00.000Z',
  }

  // Server response for savePosition may have older completedLessonIds
  const serverResponseRecord: ProgressRecord = {
    _id: 'record-1',
    userId: 'user-1',
    courseId: 'course-1',
    completedLessonIds: ['lesson-1'], // stale completions on server
    lastLessonId: 'lesson-2',
    lastPositionSeconds: 45,
    lastUpdated: '2026-09-07T12:01:00.000Z',
  }

  // Field-level position merge
  const merged: ProgressRecord = {
    ...currentRecord,
    lastLessonId: serverResponseRecord.lastLessonId ?? currentRecord.lastLessonId,
    lastPositionSeconds:
      serverResponseRecord.lastPositionSeconds ?? currentRecord.lastPositionSeconds,
    lastUpdated: serverResponseRecord.lastUpdated ?? currentRecord.lastUpdated,
  }

  assert.deepEqual(merged.completedLessonIds, ['lesson-1', 'lesson-2'])
  assert.equal(merged.lastLessonId, 'lesson-2')
  assert.equal(merged.lastPositionSeconds, 45)
  assert.equal(merged.lastUpdated, '2026-09-07T12:01:00.000Z')
})

test('progress reconciliation: savePosition error rollback reverts only position fields', () => {
  const currentRecordWithOptimisticCompletion: ProgressRecord = {
    _id: 'record-1',
    userId: 'user-1',
    courseId: 'course-1',
    completedLessonIds: ['lesson-1', 'lesson-2'], // newly added by toggleComplete
    lastLessonId: 'lesson-2',
    lastPositionSeconds: 90, // optimistic position that failed
    lastUpdated: '2026-09-07T12:02:00.000Z',
  }

  const previousRecordBeforeSavePosition: ProgressRecord = {
    _id: 'record-1',
    userId: 'user-1',
    courseId: 'course-1',
    completedLessonIds: ['lesson-1'],
    lastLessonId: 'lesson-1',
    lastPositionSeconds: 30,
    lastUpdated: '2026-09-07T12:00:00.000Z',
  }

  // Position-only rollback
  const reconciled: ProgressRecord = {
    ...currentRecordWithOptimisticCompletion,
    lastLessonId: previousRecordBeforeSavePosition.lastLessonId,
    lastPositionSeconds: previousRecordBeforeSavePosition.lastPositionSeconds,
    lastUpdated:
      previousRecordBeforeSavePosition.lastUpdated ??
      currentRecordWithOptimisticCompletion.lastUpdated,
  }

  assert.deepEqual(reconciled.completedLessonIds, ['lesson-1', 'lesson-2'])
  assert.equal(reconciled.lastLessonId, 'lesson-1')
  assert.equal(reconciled.lastPositionSeconds, 30)
})
