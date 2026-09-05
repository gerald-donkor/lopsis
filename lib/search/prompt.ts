export function buildSearchTermSystemPrompt() {
  return `Extract semantic search terms for Lopsis, a learning platform.

Return only 1 to 12 concise terms in the required structured output.

Rules:
- Preserve the learner's intent and important technical concepts.
- Include useful synonyms only when they are clearly implied.
- Prefer individual searchable words and short noun phrases.
- Use lowercase letters, numbers, spaces, apostrophes, and hyphens only.
- Keep every term at 64 characters or fewer.
- Do not answer the query, write GROQ, or invent course content.`
}
