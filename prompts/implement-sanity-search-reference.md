# Implement the Lopsis search reference

## Goal

Refine `/search` to reproduce `design/lopsis-search.png` using real Sanity lesson and video results. Use Lopsis branding as required by AGENTS.md. Match the supplied desktop layout and adapt it to mobile.

## Guidance read and code inspected

- Root `AGENTS.md` and its prompt approval workflow.
- `sanity-best-practices` skill, including its Next.js and GROQ references. Keep the project's stricter server-only token boundary over the reference's browser-token example.
- Installed Next.js guide: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- `components/search-page.tsx`, `components/site-header.tsx`, `app/search/page.tsx`, `app/search/loading.tsx`, `app/layout.tsx`, and search styles in `app/globals.css`.
- Search route, result schemas, grounding lookup, `sanity/lib/client.ts`, and both workspace package manifests.
- `prompts/use-server-owned-groq-for-search.md`, which documents the existing Gemini term extraction and fixed GROQ architecture.

## Findings and decisions

- Search already uses Gemini, Context MCP, and server-side Sanity grounding. Reuse this implementation; this task does not replace its retrieval architecture or change providers.
- Existing cards differ from the reference in width, spacing, heading typography, icons, and lesson-card proportions.
- The current sort select has only one option, and the displayed keyboard shortcut has no handler.
- Submitting an unchanged query can leave the current page stuck loading because navigation does not remount it. Handle same-query submissions and retries explicitly.
- Use actual returned results and course counts. The reference's 28 results, eight courses, example titles, artwork, and avatar are illustrative, not content to seed or hardcode.
- Use existing Clerk header controls. Do not fabricate completion marks: show them only if existing learner progress is available without building a new progress feature.
- Preserve pending changes in `package.json`, `sanity.types.ts`, and `studio/scripts/ingest-videos.ts`, plus the untracked ingestion prompt.

## Expected files

- `components/search-page.tsx`: cards, interactions, accessible state handling.
- `app/globals.css`: scoped search layout and responsive styles.
- `app/search/loading.tsx`: consistent route loading presentation if needed.
- `app/search/page.tsx`: only if route integration needs adjustment.
- `lib/search/schema.ts` and `app/api/search/route.ts`: only to keep supported sort metadata consistent with the implemented options.
- `lib/search/ground-results.ts`: only if verification reveals a missing or incorrectly mapped display field or timestamp duration.
- No Studio schema, content import, ingestion changes, or new dependencies are planned.

## Requirements

1. Match the reference's narrow striped outer margins, pale canvas, compact header, centered serif query heading, orange accents, search input, toolbar, outlined cards, and catalog callout. Use the existing fonts; use sans-serif card titles as in the image.
2. At the reference's 1122px width, target approximately 914px results width, 728px input width, and 274px visual panels. Match measured spacing and proportions while allowing real content to wrap.
3. Video cards show Sanity course identity, poster, play affordance, description, derived module and lesson labels, VIDEO badge, and a link to `/lessons/<slug>?start=<seconds>`.
4. Distinguish clip duration from the start timestamp. Use a grounded duration for the thumbnail badge and the exact stored matched second for “Watch from”. Do not present a guessed duration as fact; if the existing fallback is not grounded, omit the duration or make it nullable rather than invent one.
5. Lesson cards use compact key-point panels, stored titles and descriptions, module/lesson context, LESSON badges, and working lesson links. Missing content gets a restrained neutral fallback.
6. Render all returned ranked matches. Default to Most Relevant; provide functional Title A–Z and Course A–Z sorting with stable tie breaks, retaining both result kinds and accurate counts.
7. Support Enter submission, URL query state, back/forward navigation, Cmd/Ctrl+K focus, unchanged-query submission, request cancellation, and retry without stale results or permanent loading.
8. Provide accessible labels, visible keyboard focus, announced loading/results, empty and error states, and reduced-motion handling for skeletons. Keep the catalog callout linked to `/courses`.
9. Stack cards and callout sensibly on mobile; avoid horizontal overflow at 375px and 768px. Keep existing public browsing, authentication controls, and analytics events.

## Security

- Browser requests go only to the existing server search route. Sanity, MCP, and Gemini credentials stay on the server.
- Retain validation, published-content restrictions, grounding, chapter-first matching, filtered transcript fallback, and sanitized API errors.
- Render content as escaped React text; no injected HTML or external provider navigation.
- Do not log credentials, complete transcripts, or raw learner queries. Keep analytics limited to the existing approved metadata.

## Acceptance criteria

- Desktop appearance closely follows the reference using current Sanity data and Lopsis branding.
- Both result kinds render with truthful fields, counts, working sort choices, and correct lesson destinations.
- Repeat submissions, retries, changed queries, and browser navigation resolve cleanly.
- No fabricated catalog content, completion status, timestamp, or duration appears.
- Type check and lint pass; run a production build and dev-server verification. Clearly report any environment or pre-existing failures.
- Verify a representative live search through the configured MCP-backed route. Missing ingested video data is reported as a content prerequisite, not replaced with mocked production results.

## Checks to run

1. From the root web workspace: `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
2. Run or reuse `npm run dev`; inspect `/search` and `/search?q=data%20fetching`.
3. Exercise the live search route with a known stored lesson topic and an available video chapter/transcript term; validate returned counts, content, and destination timestamps.
4. Compare browser screenshots at 1122px against the supplied reference, then check 768px and 375px. Use available browser tooling and report if visual verification cannot run.
5. Verify ordinary, no-result, loading, API-error/retry, same-query, cancellation, sorting, keyboard, and history cases. Use controlled browser responses only for otherwise unavailable UI states, clearly distinct from live integration verification.
6. Review the diff for unrelated edits and client-side secrets. Studio deployment/import is not applicable because this scope changes no Studio schema or documents.

## Exact manual test steps

1. Start the web workspace with `npm run dev` using the existing environment.
2. Open `http://localhost:3000/search?q=data%20fetching` at 1122px width. Compare layout to `design/lopsis-search.png`; expect actual content and counts to differ.
3. Search a known catalog topic if that phrase returns no matches. Confirm real lesson cards and available video moments appear.
4. Select each sort option, then Most Relevant. Confirm the same results remain and the order changes appropriately.
5. Press Cmd+K on macOS or Ctrl+K elsewhere; edit the query and press Enter. Submit it again and confirm loading completes.
6. Navigate back and forward. Confirm the input, heading, and results correspond to the URL.
7. Open a video result and verify playback stays on the lesson page at its matched second. Open a lesson result and verify its title and notes.
8. Search an unrelated string such as `zzzxxyy123unknown`; verify the empty state and catalog link. Simulate an API failure, then retry after restoring access.
9. Repeat at 768px and 375px, checking readable metadata, reachable actions, focus indicators, and no horizontal scrolling.

## Implementation and verification results

- Implemented reference sizing, sans-serif card titles, metadata icons, clickable video posters, compact lesson styling, responsive layouts, and accessible focus states using existing components and Sanity data.
- Added Title A–Z and Course A–Z sorting, Cmd/Ctrl+K, repeat submissions, and inline retry. Preserved URL-based navigation and request cancellation.
- Removed the guessed 30-second clip duration. Chapter lengths use stored boundaries; transcript durations are nullable. Out-of-range video timestamps are excluded.
- `npx tsc --noEmit`: passed before and after implementation checks.
- `npm run lint`: passed before and after implementation checks.
- `npm run build`: passed with permitted network access; all six static pages generated. The initial restricted run compiled but exited during page generation.
- Reused the existing development server on port 3000 after the attempted second server identified it.
- Live `/api/search` returned HTTP 200: one “data fetching” request returned 46 results across eight courses (four lessons, two chapter moments, 40 transcript moments). A separate browser request returned 63 across nine; the existing Gemini term interpretation can vary between requests. Counts accurately reflect each response.
- Browser screenshots captured at 1122px, 768px, and 375px in `/tmp/lopsis-search-<width>.png`; all had no horizontal overflow. Inspected desktop and mobile screenshots.
- Browser assertions passed for both alphabetical sorts, keyboard focus, on-site result links, query changes, and matching input/URL state after back and forward navigation.
- Controlled browser responses passed error display, retry, same-query resubmission, and empty-state/catalog-link checks. These simulations were separate from live integration checks.
- Real lesson request returned HTTP 200 with the expected title and YouTube embed `start=93`. Actual third-party playback and seek behavior still warrant manual verification in a normal browser.
- Scoped `git diff --check`: passed. Whole-worktree check reports a pre-existing trailing blank line in the user's modified `sanity.types.ts`; left untouched.
- No fabricated completion marks were added because the current search response contains no learner completion state.
