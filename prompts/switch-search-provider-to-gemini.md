# Switch Lopsis search from OpenAI to Gemini

## Goal

Replace the OpenAI model provider used by the server-side Lopsis intelligent search route with Google Gemini through the Vercel AI SDK. Preserve the existing Sanity Context MCP retrieval, grounding, Zod-validated structured output, response contract, and search UI.

## Guidance read

- `AGENTS.md` at the repository root.
- `.agents/skills/sanity-best-practices/SKILL.md` and its Next.js integration reference.
- Installed Next.js 16.3.3 documentation for App Router route handlers and environment variables.
- Current AI SDK documentation for the Google Generative AI provider, `generateText`, tool calling, and `Output.object`.

## Existing code inspected

- `app/api/search/route.ts`: a Node.js, force-dynamic POST route that invokes the current OpenAI provider, uses Sanity Context MCP tools, requests `Output.object`, validates candidates with Zod, grounds them against Sanity, and returns the existing search response.
- `lib/search/context.ts`, `lib/search/prompt.ts`, `lib/search/schema.ts`, and `lib/search/ground-results.ts`: provider-independent MCP, prompt, validation, and grounding layers.
- `package.json` and `package-lock.json`: npm project using AI SDK 6, `@ai-sdk/mcp`, and `@ai-sdk/openai`.
- `.env.example`: currently documents `OPENAI_API_KEY` and `OPENAI_SEARCH_MODEL` as server-only search configuration.
- The working tree already contains unrelated and in-progress user changes; preserve them.

## Decisions and assumptions

- Use the direct Google Generative AI provider package, `@ai-sdk/google`, rather than the Google Vertex AI provider.
- Import the provider as `google` and construct the model with `google(process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-3.6-flash')`.
- Use stable `gemini-3.6-flash` as the user-requested default. Google documents support for function calling and structured outputs, making it suitable for the existing agentic search request. Keep it overridable through a server-only environment variable.
- Use the provider's conventional `GOOGLE_GENERATIVE_AI_API_KEY` variable. Do not expose the key with a `NEXT_PUBLIC_` prefix.
- Remove the direct OpenAI provider dependency because no remaining application code uses it.
- Do not change the MCP client, system prompt, candidate schema, grounding query, result schema, UI, request limits, timeout, retry count, or error behavior.

## Expected files to touch

- `app/api/search/route.ts`
- `.env.example`
- `package.json`
- `package-lock.json`

## Requirements

1. Replace `@ai-sdk/openai` with a current `@ai-sdk/google` release compatible with the installed AI SDK major version, using npm so the manifest and lockfile remain synchronized.
2. Replace the OpenAI provider import and model construction with the Google provider equivalents.
3. Change the route's configuration guard to require `GOOGLE_GENERATIVE_AI_API_KEY`.
4. Rename the optional model setting to `GOOGLE_GENERATIVE_AI_MODEL`, with `gemini-3.6-flash` as the code and `.env.example` default.
5. Remove `OPENAI_API_KEY` and `OPENAI_SEARCH_MODEL` from `.env.example`.
6. Preserve the route's server-only boundary and all existing structured-search behavior.
7. Do not edit earlier historical implementation prompts; they document the decisions made at that time.

## Security considerations

- Keep `GOOGLE_GENERATIVE_AI_API_KEY` server-only and access it only from the route handler.
- Do not add any `NEXT_PUBLIC_` Google credential.
- Do not log secrets, raw provider payloads, MCP tokens, or learner queries beyond the route's existing behavior.
- Preserve server-side Sanity token and MCP access boundaries.
- Preserve validation, bounded request size, bounded tool steps, timeout, and safe error responses.

## Acceptance criteria

- The search route imports `google` from `@ai-sdk/google` and no application code imports `@ai-sdk/openai`.
- Search configuration uses `GOOGLE_GENERATIVE_AI_API_KEY` and optional `GOOGLE_GENERATIVE_AI_MODEL` only.
- The default model is `gemini-3.6-flash`.
- `@ai-sdk/google` is installed and `@ai-sdk/openai` is absent from direct dependencies and the lockfile.
- The existing MCP tools, structured candidate output, Zod validation, grounded result hydration, result counts, and JSON response shape are unchanged.
- Type checking, linting, and the production build pass.
- The development server starts successfully.
- With valid Google and Sanity credentials, a live search reaches the Context MCP and returns grounded results; without the Google key, it returns the existing safe 503 configuration error.

## Checks to run

From the web workspace root:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. Start `npm run dev`, confirm compilation, then stop it.
5. Search the repository (excluding historical prompts and third-party files) for active `@ai-sdk/openai`, `OPENAI_API_KEY`, and `OPENAI_SEARCH_MODEL` references.
6. If valid runtime credentials are available, POST a representative query to `/api/search` and verify the live Sanity Context MCP-backed response. If credentials are unavailable, report that live verification was not run rather than claiming it passed.

## Exact manual test steps

1. Put `GOOGLE_GENERATIVE_AI_API_KEY=<your key>` in `.env.local`.
2. Optionally set `GOOGLE_GENERATIVE_AI_MODEL=gemini-3.6-flash`.
3. Keep the existing private Sanity read token and Context MCP URL/slug values configured.
4. Restart the Next.js development server so the provider and environment changes load.
5. Open the Lopsis search page.
6. Search for a topic known to exist in the seeded lessons, such as `hybrid search`.
7. Confirm the page shows a grounded result count and ranked lesson/video cards.
8. Open a lesson result and confirm it reaches the stored lesson.
9. Open a video-moment result and confirm the lesson player starts at the returned stored timestamp.
10. Temporarily remove the Google API key, restart the server, repeat the search, and confirm the UI receives the safe not-configured response without exposing configuration details.
