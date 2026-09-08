/**
 * Constructs a resume URL for a course card based on stored learner progress.
 * Navigates directly to the last lesson (with start seconds parameter when positive),
 * or falls back to the course detail page.
 */
export function getCourseResumeHref(
  courseSlug: string,
  lastLessonSlug?: string | null,
  lastPositionSeconds?: number | null,
): string {
  if (lastLessonSlug) {
    if (lastPositionSeconds && lastPositionSeconds > 0) {
      return `/lessons/${lastLessonSlug}?start=${Math.floor(lastPositionSeconds)}`;
    }
    return `/lessons/${lastLessonSlug}`;
  }
  return `/courses/${courseSlug}`;
}
