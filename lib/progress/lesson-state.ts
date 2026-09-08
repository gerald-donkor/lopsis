/** Resolves URL-directed playback before falling back to saved learner progress. */
export function resolveLessonStartSeconds({
  requestedStartSeconds,
  lessonId,
  savedLessonId,
  savedPositionSeconds,
}: {
  requestedStartSeconds: number
  lessonId: string
  savedLessonId?: string
  savedPositionSeconds?: number
}): number {
  if (requestedStartSeconds > 0) return Math.floor(requestedStartSeconds)
  if (savedLessonId !== lessonId || !savedPositionSeconds || savedPositionSeconds <= 0) {
    return 0
  }
  return Math.floor(savedPositionSeconds)
}

/** Reports whether every lesson in a non-empty module is completed. */
export function isModuleCompleted(
  lessonIds: string[],
  completedLessonIds: string[],
): boolean {
  return lessonIds.length > 0 && lessonIds.every((id) => completedLessonIds.includes(id))
}

/** Guards automatic completion so anonymous or already-completed playback cannot mutate progress. */
export function shouldAutoCompleteLesson(
  courseId: string | null,
  isSignedIn: boolean,
  isCompleted: boolean,
): boolean {
  return Boolean(courseId && isSignedIn && !isCompleted)
}
