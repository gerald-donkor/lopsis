'use client'

import { useCallback, useSyncExternalStore } from 'react'

import type { BookmarkItem, BookmarkType } from './types'

export const BOOKMARKS_STORAGE_KEY = 'lopsis:bookmarks'
export const BOOKMARKS_EVENT = 'lopsis:bookmarks:changed'

/** Parses persisted bookmark JSON and discards malformed entries. */
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

/** Reports whether a bookmark list contains the requested item. */
export function isBookmarkedInList(list: BookmarkItem[], id: string): boolean {
  return list.some((item) => item.id === id)
}

/** Adds a missing bookmark or removes an existing bookmark without mutating the list. */
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

/** Removes a bookmark by ID without mutating the original list. */
export function removeBookmarkFromList(
  list: BookmarkItem[],
  id: string,
): BookmarkItem[] {
  return list.filter((b) => b.id !== id)
}

let cachedRaw: string | null = null
let cachedBookmarks: BookmarkItem[] = []
let storageOutOfSync = false
const EMPTY_BOOKMARKS: BookmarkItem[] = []

export function resetBookmarksCacheForTesting() {
  cachedRaw = null
  cachedBookmarks = []
  storageOutOfSync = false
}

/** Safely reads stored bookmarks with fallback on storage failure or SSR. */
export function readSafeBookmarks(fallback: BookmarkItem[] = EMPTY_BOOKMARKS): BookmarkItem[] {
  if (typeof window === 'undefined') {
    return fallback
  }
  if (storageOutOfSync) {
    return cachedBookmarks
  }
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    return parseBookmarks(raw)
  } catch {
    return fallback
  }
}

/** Persists bookmarks and notifies same-window subscribers, updating in-memory cache even on storage errors. */
export function persistBookmarks(nextBookmarks: BookmarkItem[]) {
  if (typeof window === 'undefined') return
  let raw: string | null = null
  let storageFailed = false
  try {
    raw = JSON.stringify(nextBookmarks)
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, raw)
  } catch (error) {
    storageFailed = true
    console.error('Failed to save bookmarks to localStorage:', error)
  }
  cachedRaw = storageFailed ? null : raw
  cachedBookmarks = nextBookmarks
  storageOutOfSync = storageFailed
  try {
    window.dispatchEvent(
      new CustomEvent(BOOKMARKS_EVENT, { detail: nextBookmarks }),
    )
  } catch (error) {
    console.error('Failed to dispatch bookmarks event:', error)
  }
}

export const BOOKMARKS_LOCK_KEY = 'lopsis:bookmarks:lock'
const LOCK_TIMEOUT_MS = 60

/**
 * Best-effort synchronous cross-tab coordination lock for bookmark mutations.
 * Uses a short-lived localStorage lock key with a bounded deadline. If storage access
 * is restricted, unavailable, or throws (SecurityError, QuotaExceededError), it gracefully
 * falls back to in-memory execution while guaranteeing lock cleanup.
 */
export function runSynchronizedMutation<T>(
  fallback: BookmarkItem[],
  mutate: (current: BookmarkItem[]) => { next: BookmarkItem[]; result: T },
): T {
  if (typeof window === 'undefined') {
    const { result } = mutate(fallback)
    return result
  }

  const lockId = `${Date.now()}_${Math.random()}`
  let lockAcquired = false

  try {
    const deadline = Date.now() + LOCK_TIMEOUT_MS
    while (Date.now() < deadline) {
      const lockVal = window.localStorage.getItem(BOOKMARKS_LOCK_KEY)
      if (!lockVal || Number(lockVal.split(':')[1]) < Date.now()) {
        window.localStorage.setItem(
          BOOKMARKS_LOCK_KEY,
          `${lockId}:${Date.now() + 100}`,
        )
        const check = window.localStorage.getItem(BOOKMARKS_LOCK_KEY)
        if (check?.startsWith(lockId)) {
          lockAcquired = true
          break
        }
      }
    }
  } catch {
    // If storage access is restricted, continue mutation with fallback
  }

  try {
    const current = readSafeBookmarks(fallback)
    const { next, result } = mutate(current)
    persistBookmarks(next)
    return result
  } finally {
    if (lockAcquired) {
      try {
        const check = window.localStorage.getItem(BOOKMARKS_LOCK_KEY)
        if (check?.startsWith(lockId)) {
          window.localStorage.removeItem(BOOKMARKS_LOCK_KEY)
        }
      } catch {}
    }
  }
}

/** Returns a stable client snapshot of the current persisted bookmarks. */
export function getSnapshot(): BookmarkItem[] {
  if (typeof window === 'undefined') {
    return EMPTY_BOOKMARKS
  }
  if (storageOutOfSync) {
    return cachedBookmarks
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
    return cachedBookmarks.length > 0 ? cachedBookmarks : EMPTY_BOOKMARKS
  }
}

/** Returns the empty bookmark snapshot used during server rendering. */
function getServerSnapshot(): BookmarkItem[] {
  return EMPTY_BOOKMARKS
}

/** Subscribes to same-window and cross-tab bookmark changes. */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  /** Notifies subscribers when another tab changes bookmark storage. */
  function handleStorage(e: StorageEvent) {
    if (e.key === BOOKMARKS_STORAGE_KEY) {
      storageOutOfSync = false
      cachedRaw = null
      callback()
    }
  }

  /** Notifies subscribers when this window changes bookmarks. */
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

/** Provides reactive bookmark state and persistence actions. */
export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  /** Checks the current bookmark snapshot for an item. */
  const isBookmarked = useCallback(
    (id: string): boolean => {
      return isBookmarkedInList(bookmarks, id)
    },
    [bookmarks],
  )

  /** Toggles an item in persistent bookmark storage. */
  const toggleBookmark = useCallback(
    (item: { id: string; type: BookmarkType; title: string; slug: string }): boolean => {
      return runSynchronizedMutation(bookmarks, (current) => {
        const { next, isAdded } = toggleBookmarkInList(current, item)
        return { next, result: isAdded }
      })
    },
    [bookmarks],
  )

  /** Adds an item to persistent bookmark storage if it is not already saved. */
  const addBookmark = useCallback(
    (item: { id: string; type: BookmarkType; title: string; slug: string }): void => {
      runSynchronizedMutation(bookmarks, (current) => {
        if (isBookmarkedInList(current, item.id)) {
          return { next: current, result: undefined }
        }
        const { next } = toggleBookmarkInList(current, item)
        return { next, result: undefined }
      })
    },
    [bookmarks],
  )

  /** Removes an item from persistent bookmark storage. */
  const removeBookmark = useCallback(
    (id: string): void => {
      runSynchronizedMutation(bookmarks, (current) => {
        const next = removeBookmarkFromList(current, id)
        return { next, result: undefined }
      })
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
