import 'server-only'

export function requireSlug(slug: string) {
  const normalizedSlug = slug.trim()

  if (!normalizedSlug) {
    throw new Error('A non-empty slug is required')
  }

  return normalizedSlug
}
