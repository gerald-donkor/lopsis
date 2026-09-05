import 'server-only'

import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'
import {dataset, projectId} from '@/sanity/env'

const CONTEXT_API_VERSION = 'v2026-03-03'
const DEFAULT_CONTEXT_SLUG = 'lopsis-learning-search'
const CACHE_TTL_MS = 5 * 60 * 1000

let cachedInitialContext: {value: string; expiresAt: number} | null = null

function token() {
  const value = process.env.SANITY_API_READ_TOKEN
  if (!value) throw new Error('Search service is not configured')
  return value
}

export function contextMcpUrl() {
  const configured = process.env.SANITY_CONTEXT_MCP_URL
  if (configured) {
    const url = new URL(configured)
    if (url.protocol !== 'https:' || url.hostname !== 'api.sanity.io') throw new Error('Search service is not configured')
    return url.toString()
  }
  const slug = process.env.SANITY_CONTEXT_SLUG || DEFAULT_CONTEXT_SLUG
  return `https://api.sanity.io/${CONTEXT_API_VERSION}/context/mcp/${encodeURIComponent(projectId)}/${encodeURIComponent(dataset)}/${encodeURIComponent(slug)}`
}

function initialContextUrl() {
  const url = new URL(contextMcpUrl())
  url.pathname = `${url.pathname.replace(/\/$/, '')}/initial-context`
  return url.toString()
}

export async function getInitialContext(signal?: AbortSignal) {
  if (cachedInitialContext && cachedInitialContext.expiresAt > Date.now()) return cachedInitialContext.value
  const response = await fetch(initialContextUrl(), {headers: {Authorization: `Bearer ${token()}`}, signal, cache: 'no-store'})
  if (!response.ok) throw new Error('Learning search context is unavailable')
  const value = (await response.text()).slice(0, 120_000)
  cachedInitialContext = {value, expiresAt: Date.now() + CACHE_TTL_MS}
  return value
}

export function createSearchMcpClient(): Promise<MCPClient> {
  return createMCPClient({
    transport: {
      type: 'http',
      url: contextMcpUrl(),
      headers: {Authorization: `Bearer ${token()}`},
    },
    clientName: 'lopsis-learning-search',
  })
}
