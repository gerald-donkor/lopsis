import type {Metadata} from 'next'
import {SearchPage} from '@/components/search-page'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search your learning — Lopsis',
  description: 'Find relevant lessons and exact video moments across Lopsis courses.',
}

export default async function SearchRoute({searchParams}: {searchParams: Promise<{q?: string | string[]}>}) {
  const params = await searchParams
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 240) ?? ''
  return <SearchPage key={query} initialQuery={query} />
}
