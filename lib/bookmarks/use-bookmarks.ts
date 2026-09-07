'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { BookmarkItem, BookmarkType } from './types'

export const BOOKMARKS_STORAGE_KEY = 'lopsis:bookmarks'
export const BOOKMARKS_EVENT = 'lopsis:bookmarks:changed'

export function parseBookmarks(raw: string | null): BookmarkItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is BookmarkItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        (item.type === 'course' || item.type === 'lesson') &&
        typeof item.title === 'string' &&
        typeof item.slug === 'string',
    )
  } catch {
    return []
  }
}

export function isBookmarkedInList(list: BookmarkItem[], id: string): boolean {
  return list.some((item) => item.id === id)
}

export function toggleBookmarkInList(
  list: BookmarkItem[],
  item: { id: string; type: BookmarkType; title: string; slug: string },
): { next: BookmarkItem[]; isAdded: boolean } {
  const exists = list.some((b) => b.id === item.id)
  if (exists) {
    return {
      next: list.filter((b) => b.id !== item.id),
      isAdded: false,
    }
  }

  const newItem: BookmarkItem = {
    ...item,
    bookmarkedAt: new Date().toISOString(),
  }
  return {
    next: [newItem, ...list],
    isAdded: true,
  }
}

export function removeBookmarkFromList(
  list: BookmarkItem[],
  id: string,
): BookmarkItem[] {
  return list.filter((b) => b.id !== id)
}

function persistBookmarks(nextBookmarks: BookmarkItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify(nextBookmarks),
    )
    window.dispatchEvent(
      new CustomEvent(BOOKMARKS_EVENT, { detail: nextBookmarks }),
    )
  } catch (error) {
    console.error('Failed to save bookmarks to localStorage:', error)
  }
}

let cachedRaw: string | null = null
let cachedBookmarks: BookmarkItem[] = []
const EMPTY_BOOKMARKS: BookmarkItem[] = []

function getSnapshot(): BookmarkItem[] {
  if (typeof window === 'undefined') {
    return EMPTY_BOOKMARKS
  }
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (raw === cachedRaw) {
      return cachedBookmarks
    }
    cachedRaw = raw
    cachedBookmarks = parseBookmarks(raw)
    return cachedBookmarks
  } catch {
    return EMPTY_BOOKMARKS
  }
}

function getServerSnapshot(): BookmarkItem[] {
  return EMPTY_BOOKMARKS
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleStorage(e: StorageEvent) {
    if (e.key === BOOKMARKS_STORAGE_KEY) {
      callback()
    }
  }

  function handleCustomEvent() {
    callback()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(BOOKMARKS_EVENT, handleCustomEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(BOOKMARKS_EVENT, handleCustomEvent)
  }
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const isBookmarked = useCallback(
    (id: string): boolean => {
      return isBookmarkedInList(bookmarks, id)
    },
    [bookmarks],
  )

  const toggleBookmark = useCallback(
    (item: { id: string; type: BookmarkType; title: string; slug: string }): boolean => {
      const current = typeof window !== 'undefined'
        ? parseBookmarks(window.localStorage.getItem(BOOKMARKS_STORAGE_KEY))
        : bookmarks
      const { next, isAdded } = toggleBookmarkInList(current, item)
      persistBookmarks(next)
      return isAdded
    },
    [bookmarks],
  )

  const addBookmark = useCallback(
    (item: { id: string; type: BookmarkType; title: string; slug: string }): void => {
      const current = typeof window !== 'undefined'
        ? parseBookmarks(window.localStorage.getItem(BOOKMARKS_STORAGE_KEY))
        : bookmarks
      if (!isBookmarkedInList(current, item.id)) {
        const { next } = toggleBookmarkInList(current, item)
        persistBookmarks(next)
      }
    },
    [bookmarks],
  )

  const removeBookmark = useCallback(
    (id: string): void => {
      const current = typeof window !== 'undefined'
        ? parseBookmarks(window.localStorage.getItem(BOOKMARKS_STORAGE_KEY))
        : bookmarks
      const next = removeBookmarkFromList(current, id)
      persistBookmarks(next)
    },
    [bookmarks],
  )

  return {
    bookmarks,
    isLoaded: typeof window !== 'undefined',
    isBookmarked,
    toggleBookmark,
    addBookmark,
    removeBookmark,
  }
}
