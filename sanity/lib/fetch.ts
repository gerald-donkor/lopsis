import 'server-only'

import type {QueryParams} from 'next-sanity'

import {client} from './client'

const DEFAULT_REVALIDATE_SECONDS = 3600

type SanityFetchOptions<QueryString extends string> = {
  query: QueryString
  params?: QueryParams
  tags?: string[]
  revalidate?: number | false
}

export function sanityFetch<const QueryString extends string>({
  query,
  params = {},
  tags = [],
  revalidate = DEFAULT_REVALIDATE_SECONDS,
}: SanityFetchOptions<QueryString>) {
  return client.fetch(query, params, {
    next: {
      revalidate,
      tags,
    },
  })
}
