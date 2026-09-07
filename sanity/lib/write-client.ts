import 'server-only'

import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

const token = getWriteToken()

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  perspective: 'published',
  useCdn: false,
})

/** Resolves the server-only Sanity token required for progress writes. */
function getWriteToken(): string {
  const token =
    process.env.SANITY_API_WRITE_TOKEN ||
    process.env.SANITY_API_TOKEN ||
    process.env.SANITY_API_READ_TOKEN

  if (!token) {
    throw new Error(
      'Missing Sanity write token: SANITY_API_WRITE_TOKEN, SANITY_API_TOKEN, or SANITY_API_READ_TOKEN must be set.',
    )
  }

  return token
}
