import type {StructureResolver} from 'sanity/structure'
import {BookIcon} from '@sanity/icons/Book'
import {PlayIcon} from '@sanity/icons/Play'
import {TagIcon} from '@sanity/icons/Tag'
import {UserIcon} from '@sanity/icons/User'
import {SearchIcon} from '@sanity/icons/Search'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Lopsis content')
    .items([
      S.documentTypeListItem('course').title('Courses').icon(BookIcon),
      S.documentTypeListItem('lesson').title('Lessons').icon(PlayIcon),
      S.documentTypeListItem('video').title('Video intelligence').icon(PlayIcon),
      S.divider(),
      S.documentTypeListItem('instructor').title('Instructors').icon(UserIcon),
      S.documentTypeListItem('category').title('Categories').icon(TagIcon),
      S.divider(),
      S.documentTypeListItem('sanity.agentContext').title('Search context').icon(SearchIcon),
    ])
