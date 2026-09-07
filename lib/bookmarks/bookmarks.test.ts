import assert from 'node:assert/strict'
import test from 'node:test'

import type { BookmarkItem } from './types'
import {
  BOOKMARKS_EVENT,
  getSnapshot,
  isBookmarkedInList,
  parseBookmarks,
  persistBookmarks,
  readSafeBookmarks,
  removeBookmarkFromList,
  resetBookmarksCacheForTesting,
  runSynchronizedMutation,
  toggleBookmarkInList,
} from './use-bookmarks'

test('bookmarks: parseBookmarks safely parses valid JSON array', () => {
  const json = JSON.stringify([
    {
      id: 'course-1',
      type: 'course',
      title: 'Course 1',
      slug: 'course-1',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
  ])

  const parsed = parseBookmarks(json)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].id, 'course-1')
  assert.equal(parsed[0].type, 'course')
  assert.equal(parsed[0].title, 'Course 1')
})

test('bookmarks: parseBookmarks handles corrupted or empty input', () => {
  assert.deepEqual(parseBookmarks(null), [])
  assert.deepEqual(parseBookmarks(''), [])
  assert.deepEqual(parseBookmarks('{ invalid json }'), [])
  assert.deepEqual(parseBookmarks('{"not": "an array"}'), [])
  assert.deepEqual(
    parseBookmarks(JSON.stringify([{ invalid: 'structure' }])),
    [],
  )
})

test('bookmarks: toggleBookmarkInList adds new bookmark with timestamp', () => {
  const initial: BookmarkItem[] = []
  const item = {
    id: 'course-abc',
    type: 'course' as const,
    title: 'Advanced Next.js',
    slug: 'advanced-nextjs',
  }

  const { next, isAdded } = toggleBookmarkInList(initial, item)
  assert.equal(isAdded, true)
  assert.equal(next.length, 1)
  assert.equal(next[0].id, 'course-abc')
  assert.equal(next[0].type, 'course')
  assert.equal(next[0].slug, 'advanced-nextjs')
  assert.ok(next[0].bookmarkedAt)
  assert.equal(isBookmarkedInList(next, 'course-abc'), true)
})

test('bookmarks: toggleBookmarkInList removes existing bookmark', () => {
  const initial: BookmarkItem[] = [
    {
      id: 'course-abc',
      type: 'course',
      title: 'Advanced Next.js',
      slug: 'advanced-nextjs',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
    {
      id: 'lesson-xyz',
      type: 'lesson',
      title: 'Server Components Deep Dive',
      slug: 'server-components-deep-dive',
      bookmarkedAt: '2026-09-07T12:05:00.000Z',
    },
  ]

  const { next, isAdded } = toggleBookmarkInList(initial, {
    id: 'course-abc',
    type: 'course',
    title: 'Advanced Next.js',
    slug: 'advanced-nextjs',
  })

  assert.equal(isAdded, false)
  assert.equal(next.length, 1)
  assert.equal(next[0].id, 'lesson-xyz')
  assert.equal(isBookmarkedInList(next, 'course-abc'), false)
  assert.equal(isBookmarkedInList(next, 'lesson-xyz'), true)
})

test('bookmarks: removeBookmarkFromList removes item by id', () => {
  const initial: BookmarkItem[] = [
    {
      id: 'course-abc',
      type: 'course',
      title: 'Advanced Next.js',
      slug: 'advanced-nextjs',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
  ]

  const after = removeBookmarkFromList(initial, 'course-abc')
  assert.equal(after.length, 0)
})

test('bookmarks: readSafeBookmarks returns fallback when window is undefined', () => {
  const fallback: BookmarkItem[] = [
    {
      id: 'course-1',
      type: 'course',
      title: 'Course 1',
      slug: 'course-1',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
  ]
  const result = readSafeBookmarks(fallback)
  assert.deepEqual(result, fallback)
})

test('bookmarks: readSafeBookmarks returns empty array when storage is empty', () => {
  const originalWindow = globalThis.window
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {
      localStorage: {
        getItem: () => null,
      },
    }
    assert.deepEqual(readSafeBookmarks([]), [])
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = originalWindow
  }
})

test('bookmarks: readSafeBookmarks falls back when localStorage throws SecurityError', () => {
  const fallback: BookmarkItem[] = [
    {
      id: 'course-fb',
      type: 'course',
      title: 'Fallback Course',
      slug: 'fallback-course',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
  ]
  const originalWindow = globalThis.window
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError: Access is denied')
        },
      },
    }
    assert.deepEqual(readSafeBookmarks(fallback), fallback)
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = originalWindow
  }
})

test('bookmarks: persistBookmarks updates snapshot and dispatches event when setItem throws', () => {
  resetBookmarksCacheForTesting()
  const originalWindow = globalThis.window
  let dispatchedDetail: unknown = null
  const testItem: BookmarkItem = {
    id: 'course-err',
    type: 'course',
    title: 'Error Recovery Course',
    slug: 'error-recovery-course',
    bookmarkedAt: '2026-09-07T12:00:00.000Z',
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError: storage quota full')
        },
      },
      dispatchEvent: (event: CustomEvent) => {
        if (event.type === BOOKMARKS_EVENT) {
          dispatchedDetail = event.detail
        }
        return true
      },
    }

    persistBookmarks([testItem])
    assert.deepEqual(dispatchedDetail, [testItem])
    assert.deepEqual(getSnapshot(), [testItem])
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = originalWindow
    resetBookmarksCacheForTesting()
  }
})

test('bookmarks: runSynchronizedMutation executes and dispatches when storage throws', () => {
  resetBookmarksCacheForTesting()
  const originalWindow = globalThis.window
  let eventDispatched = false
  const fallback: BookmarkItem[] = [
    {
      id: 'existing-item',
      type: 'lesson',
      title: 'Existing Lesson',
      slug: 'existing-lesson',
      bookmarkedAt: '2026-09-07T12:00:00.000Z',
    },
  ]

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError: Access is denied')
        },
        setItem: () => {
          throw new Error('SecurityError: Access is denied')
        },
        removeItem: () => {
          throw new Error('SecurityError: Access is denied')
        },
      },
      dispatchEvent: (event: CustomEvent) => {
        if (event.type === BOOKMARKS_EVENT) {
          eventDispatched = true
        }
        return true
      },
    }

    const result = runSynchronizedMutation(fallback, (current) => {
      assert.deepEqual(current, fallback)
      return {
        next: [],
        result: 'cleared',
      }
    })

    assert.equal(result, 'cleared')
    assert.equal(eventDispatched, true)
    assert.deepEqual(getSnapshot(), [])
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).window = originalWindow
    resetBookmarksCacheForTesting()
  }
})

