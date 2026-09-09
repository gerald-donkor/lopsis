import type { BookmarkItem } from '../bookmarks/types';
import type { CourseProgressSummary } from './types';

export interface CourseWithMetadata {
  _id: string;
  slug: string;
  lessonCount?: number | null;
}

/**
 * Filters courses to find those the signed-in learner has started but not yet completed.
 */
export function getInProgressCourses<T extends CourseWithMetadata>(
  courses: T[],
  getCourseProgress: (courseId: string, totalLessons?: number) => CourseProgressSummary,
  isSignedIn: boolean,
): T[] {
  if (!isSignedIn || !Array.isArray(courses)) return [];

  return courses.filter((course) => {
    const total = course.lessonCount ?? 0;
    const progress = getCourseProgress(course._id, total);
    const hasStarted =
      progress.completedCount > 0 ||
      Boolean(progress.lastLessonSlug || progress.lastLessonId);
    return hasStarted && !progress.isCompleted;
  });
}

/**
 * Filters courses to find those the signed-in learner has completed 100%.
 */
export function getCompletedCourses<T extends CourseWithMetadata>(
  courses: T[],
  getCourseProgress: (courseId: string, totalLessons?: number) => CourseProgressSummary,
  isSignedIn: boolean,
): T[] {
  if (!isSignedIn || !Array.isArray(courses)) return [];

  return courses.filter((course) => {
    const total = course.lessonCount ?? 0;
    const progress = getCourseProgress(course._id, total);
    return Boolean(
      progress.isCompleted ||
        (total > 0 && progress.completedCount >= total),
    );
  });
}

export interface PartitionedBookmarks<T extends CourseWithMetadata> {
  bookmarkedCourses: T[];
  bookmarkedLessons: BookmarkItem[];
}

/**
 * Partitions saved bookmarks into matching course documents and bookmarked lessons.
 */
export function partitionBookmarks<T extends CourseWithMetadata>(
  bookmarks: BookmarkItem[],
  courses: T[],
): PartitionedBookmarks<T> {
  if (!Array.isArray(bookmarks)) {
    return { bookmarkedCourses: [], bookmarkedLessons: [] };
  }

  const courseMap = new Map<string, T>();
  for (const course of courses || []) {
    if (course._id) courseMap.set(course._id, course);
    if (course.slug) courseMap.set(course.slug, course);
  }

  const bookmarkedCourses: T[] = [];
  const bookmarkedLessons: BookmarkItem[] = [];

  for (const bookmark of bookmarks) {
    if (bookmark.type === 'course') {
      const match = courseMap.get(bookmark.id) || courseMap.get(bookmark.slug);
      if (match && !bookmarkedCourses.some((c) => c._id === match._id)) {
        bookmarkedCourses.push(match);
      }
    } else if (bookmark.type === 'lesson') {
      bookmarkedLessons.push(bookmark);
    }
  }

  return { bookmarkedCourses, bookmarkedLessons };
}
