import 'server-only'

import {createClient} from 'next-sanity'

import {apiVersion, dataset, projectId} from '../env'

const token = assertServerEnvironmentVariable(
  process.env.SANITY_API_READ_TOKEN,
  'SANITY_API_READ_TOKEN',
)

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  perspective: 'published',
  useCdn: true,
})

function assertServerEnvironmentVariable(
  value: string | undefined,
  name: string,
) {
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }

  return value
}
