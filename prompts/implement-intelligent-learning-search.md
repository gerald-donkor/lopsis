# Implement Lopsis intelligent learning search

## Goal

Implement the Lopsis intelligent search system end to end:

1. a Sanity Context configuration scoped to learning content;
2. an offline video intelligence model and YouTube ingestion tooling for real chapter/transcript moments;
3. a server-only `/api/search` route that connects the Sanity Context MCP to OpenAI through the Vercel AI SDK and returns validated structured results;
4. a responsive `/search` results page matching `design/lopsis-search.png`, including ranked video-moment and lesson cards; and
5. homepage search submission that opens the results page.

Use **Lopsis** branding throughout. The incoming search reference’s “Vertex” wordmark must not appear in the implementation.

The feature is a full results experience, not a chat interface. It may use an LLM internally to write grounded GROQ through Sanity Context, but the browser receives only validated result data and renders cards.

## Skills and guidance read

- `AGENTS.md`
- `sanity-best-practices/SKILL.md` and its Next.js/Portable Text guidance
- `create-agent-with-sanity-context/SKILL.md`
- `create-agent-with-sanity-context/references/nextjs-agent.md`
- `create-agent-with-sanity-context/references/system-prompts.md`
- `create-agent-with-sanity-context/references/studio-setup.md`
- `dial-your-context/SKILL.md`
- `shape-your-agent/SKILL.md`
- Installed Next.js 16.3.3 App Router docs for Route Handlers, server/client boundaries, async data access, loading states, and navigation.
- Official OpenAI documentation on server-side API keys, tool-capable Responses, and strict structured JSON output.

## Code, configuration, and content inspected

- `design/lopsis-search.png` (1024 × 1536), the visual source of truth for the desktop search page.
- Existing Lopsis UI: `components/home-page.tsx`, `components/site-header.tsx`, `app/globals.css`, `app/layout.tsx`, and the course/lesson pages.
- Existing data boundary: `sanity/lib/client.ts`, `sanity/lib/fetch.ts`, `sanity/env.ts`, data helpers, GROQ queries, and generated `sanity.types.ts`.
- Studio schemas and setup: `studio/sanity.config.ts`, `studio/schema-types/**`, `studio/structure.ts`, `studio/package.json`, and TypeGen configuration.
- Seed tooling: `studio/scripts/seed/seed-content.ts`, `seed.ndjson`, and `videos.json`.
- The seed contains real YouTube IDs/titles/durations for lessons, but does **not** contain chapter markers or timestamped transcript chunks. It must not be treated as video intelligence data.
- Root `package.json` currently has no AI SDK, OpenAI provider, MCP client, Zod, `react-markdown`, or Sanity Context dependency. Existing Sanity reads use a server-only token and must remain that way.
- `.env.example` does not yet document OpenAI or Context environment variables.

## Decisions and assumptions

1. The search page reference governs desktop geometry, warm canvas, shared header, search field, count/sort controls, video/lesson card hierarchy, labels, empty-state callout, and responsiveness. Sanity data controls result text, image, course/module labels, URL, and timestamp; no screenshot result is hardcoded.
2. Search is public/read-only. It does not require Clerk authentication and never writes content, progress, search history, or transcripts from the browser.
3. The browser submits a bounded plain-text query to `/api/search`; that route is the only component that accesses the OpenAI provider, Sanity Context MCP, Context initial schema, or token-backed Sanity client.
4. Install current compatible versions after verifying them from their package sources: `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `zod`, and `react-markdown`. Do not guess versions. Use the existing direct/transitive Portable Text support rather than adding unrelated UI frameworks.
5. Before installing `@sanity/context`, inspect its current peer compatibility with this Studio’s Sanity major version. If it supports the installed Studio, register `contextPlugin` and surface its document type in the existing Studio structure. If it does not, do not force an incompatible plugin: define/use the required `sanity.agentContext` document shape and create/import the configuration document through the CLI, while recording that Insights remains unavailable until plugin compatibility exists.
6. Add a `video` document type with `url`, provider-derived safe identity, `chapters[]` (`startSeconds`, `label`), and short timestamped `chunks[]` (`startSeconds`, `text`). Video documents are internal lookups only: the public search response never exposes a whole video document or an entire transcript/chunks array.
7. Add an offline YouTube-only ingestion command for the currently seeded provider. It derives a safe deterministic document ID from the normalized HTTPS video URL, validates source payloads, chunks real retrieved caption text into small timestamped records, persists only actual chapter markers/caption chunks, and is idempotent. Unsupported Vimeo/Bunny lessons remain supported for lesson playback but must not claim video-moment search until both provider-specific ingestion and reliable seek support are implemented. Never run ingestion in the request path.
8. `videos.json` may be used only to map seeded lesson IDs to known video IDs/titles/durations. It cannot become chapters or transcripts. If a selected YouTube video exposes no captions/chapters, log and skip it; do not invent `0:00` moments. The search UI can still return grounded lesson results.
9. Add a `sanity.agentContext` document named/sluggified `lopsis-learning-search`, scoped to published `course`, `lesson`, `instructor`, `category`, and internal `video` documents. Its concise Instructions are pure deltas verified from the schema: courses own ordered embedded modules that reference lessons; lessons do not have a parent-course field; use reverse references to recover course/module context; `notes` is Portable Text and must use `pt::text(notes)` for keyword search; video documents are internal and must always resolve back to their linked lesson/course; chapters are searched before chunks; tokenise user terms, wildcard each term, OR terms, and rank exact title/label hits higher. It must prohibit raw transcript-array retrieval and invented results.
10. Put critical rules in both the Context document and a short inline system prompt: use Sanity tools for every result; return only known fields; search lesson topics and video moments; chapters first, chunks only when no chapter match; title/label exactness outranks broad notes/text matches; no semantic function unless the dataset confirms embeddings; and return the specified structured schema only.
11. Fetch and cache the Context MCP `/initial-context` payload server-side with a short TTL. Use a slug-scoped MCP endpoint, Bearer `SANITY_API_READ_TOKEN`, fetch only the tools required by the search route, and close the MCP client on every outcome. Changes to cache-sensitive prompt/context content require server restart/cache expiry as appropriate.
12. Use OpenAI via `@ai-sdk/openai` and the Vercel AI SDK. Constrain output to a Zod schema with a finite query length, max tool steps, timeouts/error handling, and a narrow result model. Validate server-side again before returning JSON. An LLM failure, MCP failure, or malformed response returns a safe JSON error and no partial invented cards.
13. The result contract has exactly two card kinds:
    - `video`: lesson slug/title, course title/icon, module and derived lesson label, thumbnail/poster, description derived from returned data, matched `startSeconds`, and an action to `/lessons/[slug]?start=<seconds>`.
    - `lesson`: lesson slug/title, course title/icon, module and derived lesson label, authored key points, short description, and an action to `/lessons/[slug]`.
    Result IDs/URLs/counts must be derived from the validated records returned by GROQ, never supplied as model prose.
14. Sort defaults to “Most relevant.” The API returns stable relevance order and enough scoring metadata for the client to apply the supported UI sorts without re-querying. If only relevance is grounded/defined, other sort options must not promise a false order; offer only real supported controls.
15. The result count is calculated from validated returned cards and course IDs, not model text. De-duplicate cards by kind/lesson/start timestamp and preserve the best grounded rank. Render no arbitrary cap; use practical server bounds only to prevent abusive responses and state them in the API contract.
16. Homepage search submits on Enter and form submit to `/search?q=...`, retains the query, and provides accessible keyboard shortcut UI only if it actually focuses the field. The `/search` page handles direct navigation, invalid/blank input, loading, error, and no-result states without a chat transcript.
17. Capture `search_performed`, result-card click, video-moment click, and zero-result events through the existing browser PostHog setup with non-sensitive properties (query length/normalized query only if permitted by current analytics policy, result count, result type, course/lesson slug, start second). Do not send MCP output, transcripts, tokens, or private content to PostHog.
18. Do not add conversation insights/classification in this task: it is designed for chat transcripts and is out of scope for this structured search interface. The Context document and agent are still set up so later tuning can use the relevant skills.

## Files expected to create or change

- `app/search/page.tsx` and optionally `app/search/loading.tsx`
- `app/api/search/route.ts`
- `components/search-page.tsx`, `components/search-results.tsx`, and small focused card/form components as needed
- `components/home-page.tsx` for real homepage form submission
- `app/globals.css` for reference-fidelity search layout and responsive states
- `lib/search/**` for server-only MCP setup, initial-context cache, system prompt, output schema, result normalization, and provider-independent utilities
- `studio/schema-types/documents/video.ts`
- Context document schema/Studio configuration/structure files only as compatibility permits
- `studio/scripts/ingest-videos.ts` and narrowly scoped ingestion helpers
- `studio/scripts/seed/**` only to create/import the Lopsis Context config or real, successfully ingested video documents
- `package.json`, lockfile, `studio/package.json`, and Studio lockfile only for verified required packages
- `.env.example` for the canonical new variable list
- `sanity.types.ts` only from `npm run typegen` after query/schema changes

## Requirements

### 1. Studio, Context, and video intelligence

- Maintain the standalone Studio architecture.
- Add the minimal internal video schema described above, strict field validation, sensible previews, and no full-transcript field.
- Build idempotent, offline YouTube ingestion; validate provider URL/identity and output, chunk captions conservatively, and never mutate unrelated documents.
- Add/publish the Lopsis Context configuration with its verified scope and concise Instructions.
- Deploy the Studio application, deploy schema, import the context/video documents, and verify the live slugged Context endpoint after implementation.

### 2. Server API

- Implement `POST /api/search` as a dynamic server Route Handler.
- Validate request body with Zod: nonempty string, trim whitespace, fixed maximum length, reject malformed JSON and oversized input with 400.
- Use only server environment variables for `OPENAI_API_KEY`, model configuration, Sanity Context MCP URL/slug, and Sanity read token.
- Get schema context via `/initial-context`; connect tools over authenticated HTTP; exclude redundant `initial_context`; limit tool calls and results; always close the MCP client.
- Request structured output and run post-generation Zod validation plus deterministic normalization/grounding checks.
- Return a versioned JSON response including normalized query, cards, result count, distinct course count, and supported sort options. Never stream raw model prose/tool calls to the browser.
- Return explicit 4xx/5xx JSON errors with safe user-facing messages; avoid leaking environment names, URLs, prompts, schema internals, or provider errors.

### 3. Grounded result behavior

- Search lessons on title, key points, and `pt::text(notes)`.
- Search video chapters first. Only use matching transcript chunks when no relevant chapter matches for a lesson/video.
- Tokenize query words; wildcard individual tokens and combine terms with OR. Do not text-match the full query phrase as a single pattern.
- Always tie video moments to lessons/courses/modules with real reverse-reference results.
- Never return raw `video` documents or whole chunk arrays to the model/client.
- Rank exact lesson title/chapter label matches above broad note/transcript keyword matches. Keep stable ties.
- Empty results render a clear all-courses CTA. Video result links seek on the existing on-page lesson player.

### 4. Search results UI

- Closely reproduce `design/lopsis-search.png` at 1024px: Lopsis shared header, centered query title/count, large search input, sort control, stacked card layouts, badges, actions, and bottom empty-state callout.
- Render distinct visual variants for `video` versus `lesson` results without masquerading a lesson result as a timed clip.
- Use real Sanity poster/icons with safe fallbacks; label result type, derived lesson/module position, and time using validated data.
- Handle initial empty query, submitting/loading, errors, no results, and a successful large result set accessibly.
- Keep all interaction in client components but keep data/LLM/MCP code server-only.
- Make the page responsive below the reference width with stacked controls/cards and no horizontal overflow.

### 5. Environment, analytics, and security

- Add only `OPENAI_API_KEY`, optional server-only OpenAI model name, and the Context MCP URL/slug to `.env.example`, documenting server-only scope. Reuse existing `SANITY_API_READ_TOKEN`; do not replace it with a public token.
- Update `next.config.ts` only if required for existing Sanity image hosts; do not expose keys with `NEXT_PUBLIC_` prefixes.
- Capture allowed product analytics events without transcript or model data.
- Set request limits, response-size limits, tool-step limits, and an appropriate abort/timeout strategy.

## Security considerations

- The browser must never call MCP, OpenAI, or Sanity with a token; it only calls same-origin `/api/search`.
- Validate and bound all user input and model output. Treat model output as untrusted until Zod + grounding normalization passes.
- Use the Context document filter to restrict accessible document types; exclude drafts and unrelated/internal types.
- Keep response projections small; never log or return full transcripts/chunks, prompts, API keys, token values, or MCP responses.
- Use server-only modules for MCP/OpenAI clients and avoid imports that could cross into client bundles.
- Do not use semantic similarity unless the live dataset demonstrates embeddings are enabled; keyword GROQ is the mandatory fallback.
- Avoid SSRF by never accepting MCP URLs, model names, Sanity endpoints, or provider URLs from request data.
- Ensure outgoing course/lesson links use only validated generated slugs and integer timestamps.

## Acceptance criteria

- `/search?q=<query>` matches the provided desktop reference while using Lopsis branding.
- The homepage search field submits to the results page.
- A valid query produces only structured, validated cards tied to real Sanity course/lesson documents.
- When real ingested video data exists, matching video cards link to valid lesson `?start=` values and start playback in the on-page provider embed.
- Where a video has no ingested caption/chapter data, search produces grounded lesson matches only; it never fabricates a timed moment.
- A query matching chapter labels favors chapter moments over transcript chunks; title/label exact matches rank above broad text matches.
- Search returns all validated relevant matches within documented safety bounds, correct result/course counts, and deduplicated cards.
- Blank/malformed/too-long requests return safe 400 JSON; OpenAI/MCP failures return a safe handled error state; no results displays the catalog CTA.
- MCP and OpenAI calls are provably server-side; no secret/private data is in client bundles or API JSON.
- Context schema/config is deployed, the Studio application is deployed, and a live authenticated MCP validation confirms its filter/instructions/tools.
- Type check, lint, Studio typecheck, production build, route/API checks, and the live Context/ingestion verification run with real output.

## Checks to run

1. Check package compatibility/versions before installing; run `npm install` only after that verification.
2. Run root `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
3. Run `npm run typecheck`, `npm run typegen`, `npm run build`, `npm run schema:deploy`, and `npm run deploy` from `studio/` as appropriate; report exact deploy results.
4. Run the ingestion command in dry-run mode first, then against a minimal known YouTube fixture. Verify it writes no invented records, is idempotent, and contains chunked—not whole—transcript data.
5. Authenticated live MCP checks: fetch initial context; list tools; confirm the slugged Context filter/instructions are active; run a representative grounded lesson query and a chapter/chunk query only where ingested data exists.
6. API tests with valid, blank, too-long, no-match, and representative lesson/video queries. Assert status codes, Zod response shape, no raw transcript arrays, existing linked lesson slugs, safe start integers, and correct counts.
7. Start the web dev server and verify `/`, `/search`, `/search?q=...`, existing course/lesson routes, result actions, and a missing route.
8. Inspect rendered search HTML/UI at 1024px, 768px, and 375px; check no visible `Vertex` text outside original source assets and no horizontal overflow.

## Exact manual test steps

1. Put the documented Sanity/Context and OpenAI server values in root `.env.local`; keep all tokens private.
2. From `studio/`, deploy the Studio and schema, import/publish the `lopsis-learning-search` Context configuration, and run the offline ingestion command for a captioned seeded YouTube lesson.
3. Start `npm run dev` at the repository root and open `http://localhost:3000`.
4. Submit a natural-language query from the homepage. Confirm navigation to `/search?q=...`.
5. At 1024px, compare `/search` with `design/lopsis-search.png`: header, centered result heading/count, input, sort, cards, badges, actions, and empty-state CTA.
6. Search an exact authored lesson title/topic; verify resulting lesson card title, course, module, key points, description, and URL all exist in Sanity.
7. Search a known ingested chapter/topic; verify the video card shows a real timestamp and “Watch from” opens the matching lesson on Lopsis with `?start=<integer>`, then confirm the player seeks.
8. Search a topic present only in a transcript chunk; verify it returns a video moment only when its video has no chapter match. Confirm no whole transcript appears in the page/network response.
9. Search nonsense; confirm the no-results state and Browse all courses link.
10. Try a blank and excessively long API request; confirm safe validation errors. Disconnect/temporarily omit a server key in a local test environment; confirm the UI shows a safe error, not secrets.
11. Resize to tablet/mobile and use keyboard-only navigation. Confirm responsive layout, focus states, search submission, sort control, and card actions work.
12. Recheck existing home, catalog, course, and lesson pages for regressions.
