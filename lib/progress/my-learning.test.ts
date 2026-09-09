import assert from 'node:assert/strict';
import test from 'node:test';
import type { BookmarkItem } from '../bookmarks/types';
import {
  getCompletedCourses,
  getInProgressCourses,
  partitionBookmarks,
} from './my-learning';
import type { CourseProgressSummary } from './types';

interface TestCourse {
  _id: string;
  slug: string;
  title: string;
  lessonCount: number;
}

const mockCourses: TestCourse[] = [
  { _id: 'course-1', slug: 'nextjs-fullstack', title: 'Next.js Fullstack', lessonCount: 4 },
  { _id: 'course-2', slug: 'typescript-mastery', title: 'TypeScript Mastery', lessonCount: 3 },
  { _id: 'course-3', slug: 'docker-devops', title: 'Docker DevOps', lessonCount: 5 },
  { _id: 'course-4', slug: 'ai-engineering', title: 'AI Engineering', lessonCount: 2 },
];

test('my-learning: getInProgressCourses returns empty array when signed out', () => {
  const result = getInProgressCourses(mockCourses, () => ({
    completedCount: 2,
    percentage: 50,
    isCompleted: false,
    lastLessonSlug: 'intro',
  }), false);

  assert.deepEqual(result, []);
});

test('my-learning: getInProgressCourses returns only started and uncompleted courses', () => {
  const progressMap: Record<string, CourseProgressSummary> = {
    'course-1': { completedCount: 1, percentage: 25, isCompleted: false, lastLessonId: 'l1' },
    'course-2': { completedCount: 3, percentage: 100, isCompleted: true, lastLessonId: 'l3' }, // Completed
    'course-3': { completedCount: 0, percentage: 0, isCompleted: false }, // Not started
    'course-4': { completedCount: 0, percentage: 0, isCompleted: false, lastLessonSlug: 'prompting' }, // Started via playback
  };

  const result = getInProgressCourses(
    mockCourses,
    (id) => progressMap[id] || { completedCount: 0, percentage: 0, isCompleted: false },
    true,
  );

  assert.equal(result.length, 2);
  assert.equal(result[0]._id, 'course-1');
  assert.equal(result[1]._id, 'course-4');
});

test('my-learning: getCompletedCourses returns only 100% completed courses for signed-in user', () => {
  const progressMap: Record<string, CourseProgressSummary> = {
    'course-1': { completedCount: 2, percentage: 50, isCompleted: false },
    'course-2': { completedCount: 3, percentage: 100, isCompleted: true },
    'course-3': { completedCount: 5, percentage: 100, isCompleted: false }, // Completed by count
    'course-4': { completedCount: 0, percentage: 0, isCompleted: false },
  };

  const signedOut = getCompletedCourses(mockCourses, (id) => progressMap[id], false);
  assert.deepEqual(signedOut, []);

  const signedIn = getCompletedCourses(mockCourses, (id) => progressMap[id], true);
  assert.equal(signedIn.length, 2);
  assert.equal(signedIn[0]._id, 'course-2');
  assert.equal(signedIn[1]._id, 'course-3');
});

test('my-learning: partitionBookmarks separates course documents and lesson bookmarks correctly', () => {
  const bookmarks: BookmarkItem[] = [
    { id: 'course-1', type: 'course', title: 'Next.js Fullstack', slug: 'nextjs-fullstack', bookmarkedAt: '2026-09-01T00:00:00Z' },
    { id: 'lesson-99', type: 'lesson', title: 'Server Actions Deep Dive', slug: 'server-actions', bookmarkedAt: '2026-09-02T00:00:00Z' },
    { id: 'course-unknown', type: 'course', title: 'Unpublished Course', slug: 'unpublished', bookmarkedAt: '2026-09-03T00:00:00Z' },
    { id: 'lesson-100', type: 'lesson', title: 'Streaming with Suspense', slug: 'streaming-suspense', bookmarkedAt: '2026-09-04T00:00:00Z' },
  ];

  const { bookmarkedCourses, bookmarkedLessons } = partitionBookmarks(bookmarks, mockCourses);

  assert.equal(bookmarkedCourses.length, 1);
  assert.equal(bookmarkedCourses[0]._id, 'course-1');
  assert.equal(bookmarkedLessons.length, 2);
  assert.equal(bookmarkedLessons[0].title, 'Server Actions Deep Dive');
  assert.equal(bookmarkedLessons[1].title, 'Streaming with Suspense');
});
