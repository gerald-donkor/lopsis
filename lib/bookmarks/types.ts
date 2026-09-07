export type BookmarkType = 'course' | 'lesson'

export interface BookmarkItem {
  id: string
  type: BookmarkType
  title: string
  slug: string
  bookmarkedAt: string
}
