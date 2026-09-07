import assert from 'node:assert/strict'
import test from 'node:test'

import type { BookmarkItem } from './types'
import {
  isBookmarkedInList,
  parseBookmarks,
  removeBookmarkFromList,
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
