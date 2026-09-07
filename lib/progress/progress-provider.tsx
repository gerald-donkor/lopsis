'use client'

import { useAuth } from '@clerk/nextjs'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type {
  CourseProgressSummary,
  LearnerProgressContextValue,
  ProgressRecord,
} from './types'

const LearnerProgressContext = createContext<LearnerProgressContextValue | null>(
  null,
)

/** Loads learner progress and exposes optimistic progress actions to descendants. */
export function LearnerProgressProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isSignedIn, userId } = useAuth()
  const [records, setRecords] = useState<Record<string, ProgressRecord>>({})
  const [isLoading, setIsLoading] = useState(false)
  const mutationSeqRef = useRef<Record<string, number>>({})

  const currentAuthKey = isSignedIn && userId ? userId : null
  const [prevAuthKey, setPrevAuthKey] = useState<string | null>(currentAuthKey)

  if (prevAuthKey !== currentAuthKey) {
    setPrevAuthKey(currentAuthKey)
    setRecords({})
  }

  /** Reloads all progress records for the signed-in learner. */
  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setRecords({})
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/progress')
      if (response.ok) {
        const data = (await response.json()) as { records: ProgressRecord[] }
        const map: Record<string, ProgressRecord> = {}
        for (const record of data.records || []) {
          if (record.courseId) {
            map[record.courseId] = record
          }
        }
        setRecords(map)
      }
    } catch (error) {
      console.error('Failed to refresh learner progress:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn || !userId) {
      return
    }

    const controller = new AbortController()

    fetch('/api/progress', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { records?: ProgressRecord[] } | null) => {
        if (controller.signal.aborted || !data?.records) return
        const map: Record<string, ProgressRecord> = {}
        for (const record of data.records) {
          if (record.courseId) {
            map[record.courseId] = record
          }
        }
        setRecords(map)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load learner progress:', error)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [isSignedIn, userId])

  /** Reports whether a lesson is completed in the current course record. */
  const isLessonCompleted = useCallback(
    (courseId: string, lessonId: string): boolean => {
      const record = records[courseId]
      if (!record || !record.completedLessonIds) return false
      return record.completedLessonIds.includes(lessonId)
    },
    [records],
  )

  /** Summarizes completion and resume state for a course. */
  const getCourseProgress = useCallback(
    (courseId: string, totalLessons?: number): CourseProgressSummary => {
      const record = records[courseId]
      const completedCount = record?.completedLessonIds?.length || 0
      const total = totalLessons !== undefined && totalLessons > 0 ? totalLessons : 0
      const percentage = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0
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
    },
    [records],
  )

  /** Optimistically toggles lesson completion and persists the mutation. */
  const toggleComplete = useCallback(
    async (
      courseId: string,
      lessonId: string,
      completed?: boolean,
      source: 'manual' | 'video_ended' = 'manual',
    ): Promise<boolean> => {
      if (!isSignedIn) {
        return false
      }

      const seq = (mutationSeqRef.current[courseId] || 0) + 1
      mutationSeqRef.current[courseId] = seq

      const existingRecord = records[courseId]
      const wasCompleted =
        existingRecord?.completedLessonIds?.includes(lessonId) ?? false
      const targetCompleted = completed !== undefined ? completed : !wasCompleted

      // Optimistic update
      const existingCompleted = existingRecord?.completedLessonIds || []
      const newCompleted = targetCompleted
        ? Array.from(new Set([...existingCompleted, lessonId]))
        : existingCompleted.filter((id) => id !== lessonId)

      const optimisticRecord: ProgressRecord = existingRecord
        ? {
            ...existingRecord,
            completedLessonIds: newCompleted,
            lastUpdated: new Date().toISOString(),
          }
        : {
            _id: `temp_${courseId}`,
            userId: userId || '',
            courseId,
            completedLessonIds: newCompleted,
            lastUpdated: new Date().toISOString(),
          }

      setRecords((prev) => ({
        ...prev,
        [courseId]: optimisticRecord,
      }))

      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'toggle_complete',
            courseId,
            lessonId,
            completed: targetCompleted,
            completionSource: source,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update progress on server')
        }

        const data = (await response.json()) as {
          success: boolean
          record: ProgressRecord
        }

        if (data.record && data.record.courseId) {
          if (mutationSeqRef.current[courseId] === seq) {
            setRecords((prev) => ({
              ...prev,
              [data.record.courseId]: data.record,
            }))
          }
        }

        return targetCompleted
      } catch (error) {
        console.error('Error toggling lesson completion:', error)
        // Scoped rollback: only roll back if this is still the latest mutation for courseId
        if (mutationSeqRef.current[courseId] === seq) {
          setRecords((prev) => {
            const updated = { ...prev }
            if (existingRecord) {
              updated[courseId] = existingRecord
            } else {
              delete updated[courseId]
            }
            return updated
          })
        }
        return wasCompleted
      }
    },
    [isSignedIn, records, userId],
  )

  /** Saves the learner's latest playback position for a lesson. */
  const savePosition = useCallback(
    async (
      courseId: string,
      lessonId: string,
      positionSeconds: number,
    ): Promise<void> => {
      if (!isSignedIn) return

      const seq = (mutationSeqRef.current[courseId] || 0) + 1
      mutationSeqRef.current[courseId] = seq
      const previousRecord = records[courseId]

      // Optimistic update
      setRecords((prev) => {
        const current = prev[courseId]
        if (!current) return prev
        return {
          ...prev,
          [courseId]: {
            ...current,
            lastLessonId: lessonId,
            lastPositionSeconds: positionSeconds,
            lastUpdated: new Date().toISOString(),
          },
        }
      })

      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save_position',
            courseId,
            lessonId,
            positionSeconds,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to persist video position: ${response.statusText}`)
        }

        const data = (await response.json()) as {
          success: boolean
          record: ProgressRecord
        }
        if (data.record && data.record.courseId) {
          if (mutationSeqRef.current[courseId] === seq) {
            setRecords((prev) => ({
              ...prev,
              [data.record.courseId]: data.record,
            }))
          }
        }
      } catch (error) {
        console.error('Failed to persist video position:', error)
        // Reconcile optimistic position with canonical record on failure if still latest mutation
        if (mutationSeqRef.current[courseId] === seq) {
          setRecords((prev) => {
            const updated = { ...prev }
            if (previousRecord) {
              updated[courseId] = previousRecord
            } else {
              delete updated[courseId]
            }
            return updated
          })
        }
      }
    },
    [isSignedIn, records],
  )

  /** Records that the learner resumed a lesson from a saved position. */
  const recordResume = useCallback(
    async (
      courseId: string,
      lessonId: string,
      resumePositionSeconds: number,
    ): Promise<void> => {
      if (!isSignedIn) return

      try {
        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'record_resume',
            courseId,
            lessonId,
            resumePositionSeconds,
          }),
        })
      } catch (error) {
        console.error('Failed to record resume action:', error)
      }
    },
    [isSignedIn],
  )

  const value = useMemo<LearnerProgressContextValue>(
    () => ({
      records,
      isLoading,
      isSignedIn: Boolean(isSignedIn),
      isLessonCompleted,
      getCourseProgress,
      toggleComplete,
      savePosition,
      recordResume,
      refresh,
    }),
    [
      records,
      isLoading,
      isSignedIn,
      isLessonCompleted,
      getCourseProgress,
      toggleComplete,
      savePosition,
      recordResume,
      refresh,
    ],
  )

  return (
    <LearnerProgressContext.Provider value={value}>
      {children}
    </LearnerProgressContext.Provider>
  )
}

/** Returns learner progress state from the nearest provider. */
export function useLearnerProgress(): LearnerProgressContextValue {
  const context = useContext(LearnerProgressContext)
  if (!context) {
    throw new Error(
      'useLearnerProgress must be used within a LearnerProgressProvider',
    )
  }
  return context
}
