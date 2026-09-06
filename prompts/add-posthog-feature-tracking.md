# Add PostHog tracking for Lopsis learning features

## Goal

Extend the existing PostHog integration so Lopsis measures the current search and lesson-video journeys accurately, correlates browser and server events to the same Clerk user or anonymous session, and establishes truthful event boundaries for saved resume and lesson completion actions. Keep analytics free of user profile data and scrub common direct identifiers from learner search queries before capture.

## Guidance read and code inspected

- Root `AGENTS.md`, including the server/client ownership rules, privacy constraints, prompt approval workflow, and required web checks.
- Installed Next.js 16 guidance in `node_modules/next/dist/docs/01-app/02-guides/analytics.md` and `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`.
- Clerk router and `clerk-nextjs-patterns`, including `references/server-vs-client.md` and `references/api-routes.md`. This project uses current Clerk `@clerk/nextjs` 7.8.x, so server code uses awaited `auth()`.
- Current official PostHog Next.js guidance for `instrumentation-client.ts`, stable auth IDs, `reset()` on logout, shared client/server distinct IDs, tracing headers, reverse proxying, and immediate server capture.
- Current official YouTube IFrame Player API, Vimeo Player SDK, and Bunny Stream Player.js event guidance for play, current time, duration, time updates, and ended events.
- `instrumentation-client.ts`, `lib/posthog-server.ts`, `next.config.ts`, `.env.example`, and the installed PostHog SDK versions.
- Existing analytics calls in the home, catalog, course, curriculum, search, lesson, sign-in, and sign-up components.
- `components/search-page.tsx`, `app/api/search/route.ts`, `components/lesson-video.tsx`, `components/lesson-page.tsx`, the lesson route, and the current Sanity result shapes.
- Current worktree status. Search, search grounding/schema, ingestion, styles, package metadata, and generated Sanity types already contain user changes and must be preserved.

## Findings and decisions

- Client PostHog already initializes in root `instrumentation-client.ts` and uses the existing `/ingest` reverse proxy. Keep that single initialization path.
- The app does not currently call `posthog.identify()`. Add a small Clerk/PostHog identity bridge that identifies with only the Clerk user ID after sign-in and resets after the identified user signs out. Do not send email, name, avatar, organization, or other Clerk profile fields.
- Link same-origin browser requests to server events using PostHog tracing headers. On the server, prefer the authenticated Clerk user ID and otherwise accept PostHog's distinct/session headers for anonymous attribution. Never derive identity from an IP address or user agent.
- `search_performed` currently fires in the browser only after a successful response and omits the requested query. Move the authoritative capture into the search route after validation and search completion. Capture failures separately without leaking internal error messages.
- Search queries are free text and can contain direct identifiers. Capture a normalized `query` as requested only after a shared scrubber redacts common email addresses, phone numbers, URLs, IP addresses, and obvious account handles. Keep `query_length` based on the validated input. Do not capture raw request bodies, generated search terms, transcripts, or model prompts. Names cannot be identified reliably by a regex, so this is a best-effort safeguard around an explicitly requested free-text property.
- Use stable lowercase snake_case names and stable snake_case properties. Consolidate the two search click names into `search_result_opened` with `result_type`; keep identifiers and operational metadata as properties rather than content titles or descriptions.
- Result rank must reflect the order visible when clicked. Include the selected sort, result ID, course ID/slug, lesson ID/slug, result type, rank, and video match/start metadata where applicable. Capture once per click target activation.
- Provider iframe `load` does not mean playback. Replace `lesson_video_embed_loaded` as the engagement signal with real provider player events. Keep the provider-owned embed and controls.
- Track `video_played` once for the first actual play in a lesson-page load. Track `video_watch_depth_reached` at 25, 50, 75, 90, and 100 percent, each milestone once per load, with provider, lesson/course IDs, current position, duration, start position, and milestone. Track `video_completed` from the provider ended event and `video_playback_failed` from player/API errors using safe error categories only.
- YouTube uses its IFrame Player API with JavaScript control enabled. Vimeo uses its supported Player SDK events. Bunny uses the Player.js-compatible API documented by Bunny. Clean up listeners, player instances, timers, and loaded scripts safely across navigation and React development remounts.
- A URL `start` value from a video search result is a topic timestamp, not saved progress. Do not report it as `resume_used`.
- This checkout has no saved progress route, persisted progress UI, resume affordance, or completion action; the displayed progress is hardcoded at zero. Do not fabricate `resume_used` or `lesson_completed`. Provide typed server analytics helpers/contracts for those canonical events and document that the future progress mutation must capture only after a successful persisted write. If an actual progress implementation appears in the worktree before execution, attach these events to that server success boundary rather than adding a second endpoint.
- Keep existing useful view and navigation events, but remove content titles, module titles, instructor names, and similar display copy from custom event properties. Prefer document IDs/slugs, numeric positions, booleans, counts, source, and provider. Do not emit events for presentational bookmark controls as though data was saved.
- Add `search_sort_changed`, `lesson_resource_opened`, and `lesson_tab_selected` because they reveal search refinement and lesson engagement without collecting content bodies. Avoid expanding low-value focus/hover instrumentation.

## Canonical event contract

| Event | Owner | Core properties |
| --- | --- | --- |
| `search_performed` | Search route | redacted `query`, `query_length`, `result_count`, `course_count`, `lesson_result_count`, `video_result_count`, `duration_ms`, `is_retry` when reliably known |
| `search_failed` | Search route | `status`, `duration_ms`, safe `failure_type`; query length only, no raw query |
| `search_zero_results` | Search route | redacted `query`, `query_length`, `duration_ms` |
| `search_result_opened` | Browser | `result_type`, `result_id`, `result_rank`, `sort`, course/lesson IDs and slugs, video `match_source` and `start_seconds` when applicable |
| `search_sort_changed` | Browser | `sort`, `result_count` |
| `video_played` | Provider player in browser | provider, course/lesson IDs and slugs, `position_seconds`, `duration_seconds`, `start_seconds` |
| `video_watch_depth_reached` | Provider player in browser | video properties plus `depth_percent`; one event per milestone per load |
| `video_completed` | Provider player in browser | video properties at ended |
| `video_playback_failed` | Provider player in browser | provider, course/lesson IDs and slugs, safe `failure_type` |
| `resume_used` | Future saved-progress action | server capture after saved progress is read/accepted; course/lesson IDs and `resume_position_seconds` |
| `lesson_completed` | Future progress mutation | server capture only after persistence succeeds; course/lesson IDs and safe completion source |
| `lesson_resource_opened` | Browser | course/lesson IDs and slugs, resource type and stable resource index/key; no title or URL |
| `lesson_tab_selected` | Browser | course/lesson IDs and slugs, `tab` |

## Expected files

- `instrumentation-client.ts`: preserve initialization, add same-origin tracing context if required by the installed SDK.
- `components/posthog-identity.tsx`: synchronize Clerk user ID with the PostHog browser singleton and reset correctly on sign-out.
- `app/layout.tsx`: mount the narrow identity client component inside `ClerkProvider`.
- `lib/analytics/events.ts`: canonical event names/property types shared where safe.
- `lib/analytics/privacy.ts`: deterministic query normalization and direct-identifier redaction with no logging.
- `lib/posthog-server.ts`: expose an awaited, failure-tolerant server capture helper using the installed SDK's immediate/flush behavior.
- `app/api/search/route.ts`: capture authoritative success, zero-result, and failure outcomes without changing the response contract.
- `components/search-page.tsx`: remove duplicate success capture; add consolidated result-open and sort events with visible rank.
- `components/lesson-video.tsx`: integrate player APIs and capture real playback events and milestones.
- `components/lesson-page.tsx`: supply stable lesson/course context and capture resource/tab interactions.
- Existing course/catalog/curriculum/home components: remove display text from analytics properties and normalize overlapping source properties only where needed for a coherent taxonomy.
- `package.json` and `package-lock.json`: only if supported Vimeo/Bunny player adapters require installed packages.
- `.env.example`: only if the audit finds an existing PostHog variable is missing; no private analytics key is needed for event ingestion.
- A concise analytics contract note under `docs/` only if code types cannot adequately document the future progress boundary.

## Requirements

1. Keep `instrumentation-client.ts` as the sole client initialization and the existing first-party `/ingest` rewrites.
2. Identify signed-in people with the Clerk user ID only. Reset on logout without repeatedly rotating the anonymous identity during initial signed-out renders.
3. Correlate browser and server events to the same distinct ID/session. Skip server capture safely when PostHog is unconfigured or no trustworthy anonymous/authenticated ID is available.
4. Analytics failures must never fail, delay materially, or alter search and playback behavior. Do not expose PostHog errors to learners.
5. Capture server-owned outcomes in the server route and browser-owned interactions/player events in client components. Prevent client/server duplicates.
6. Use the canonical events and properties above. Do not send titles, descriptions, notes, transcript text, resource URLs, Clerk profile fields, raw errors, model prompts, or generated model terms.
7. Scrub common direct identifiers from the requested search-query property before event capture and verify the scrubber against representative email, phone, URL, handle, IPv4, and IPv6 input.
8. Count a result opening once for the activated link and report its one-based visible rank after sorting.
9. Derive playback from provider events, not iframe load or page view. Emit depth milestones once each and avoid high-frequency `timeupdate` captures.
10. Preserve start-at-second playback for YouTube, Vimeo, and Bunny and keep playback on the Lopsis lesson page.
11. Do not treat a seek or a search timestamp as resume. Emit `resume_used` and `lesson_completed` only from real saved-progress server success paths.
12. Preserve all unrelated and pre-existing worktree changes. Do not alter Sanity schemas, search ranking, ingestion behavior, UI layout, or content.

## Security and privacy

- Use only the public PostHog project token for ingestion; do not introduce a personal/private PostHog API key.
- Keep the Clerk secret, Sanity tokens, Gemini key, and all server credentials out of client bundles and event properties.
- Trust Clerk's awaited server `auth()` for a signed-in distinct ID. Treat tracing headers only as analytics correlation metadata, never authorization.
- Bound all analytics strings and use allowlisted property objects. Sanitize raw errors into a small enum.
- Do not log analytics payloads or raw queries in production. Development diagnostics must not print the query or identity.
- Preserve public search access and current route validation. Analytics must not create a new public mutation endpoint.

## Acceptance criteria

- A signed-in learner's browser events and server search events use the Clerk user ID; anonymous events remain correlated through PostHog's anonymous distinct/session IDs.
- One successful search produces one server `search_performed` event with a redacted query and accurate lesson/video/result/course counts. Zero results also produce `search_zero_results`; failed searches produce `search_failed` without query text or internal errors.
- Opening either kind of search result produces one `search_result_opened` event with the correct type, visible rank, sort, stable identifiers, and video timestamp metadata where applicable.
- Actual provider play, milestones, end, and safe failure states produce the canonical video events for YouTube, Vimeo, and Bunny without capturing every time update.
- Lesson resource and tab actions use allowlisted metadata and omit displayed copy and URLs.
- No current UI action falsely emits `resume_used` or `lesson_completed`. Their typed server contract clearly requires successful persisted progress and can be attached without renaming when progress is implemented.
- Existing navigation and view analytics contain no personal profile data or content bodies; event names/properties are consistent and do not double-count the new canonical events.
- Type check, lint, production build, and dev-server verification pass, or pre-existing/environment failures are reported exactly.

## Checks to run

1. From the root web workspace, run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
2. Run or reuse `npm run dev` and verify PostHog debug output/network requests without exposing payloads in the final report.
3. Exercise successful, zero-result, invalid, timed-out/failed where practical, retry, and cancelled search requests. Confirm one authoritative event per completed outcome and no duplicate browser `search_performed`.
4. Verify signed-in requests use the Clerk user ID and signed-out requests preserve anonymous client/server correlation; verify logout resets the browser identity.
5. Test redaction with email, phone, URL, handle, IPv4, IPv6, and ordinary learning queries. Confirm ordinary subject terms remain useful while direct identifiers are replaced.
6. Open video and lesson results under each sort and from each clickable card region. Confirm type, one-based visible rank, sort, identifiers, timestamp, and single capture.
7. With representative YouTube, Vimeo, and Bunny lessons, verify first play, 25/50/75/90/100 depth, ended, seeking, replay, navigation cleanup, and provider failure. Confirm milestones fire at most once per lesson load and `timeupdate` is not sent as an event.
8. Verify video search timestamps still seek correctly and never emit `resume_used`.
9. Verify lesson tab and resource events omit title, description, notes, URL, and provider video URL.
10. Review the diff for unrelated edits, exposed secrets, content text in event properties, raw error/query logging, and regressions in the existing reverse proxy.

## Exact manual test steps

1. Configure the existing Clerk and PostHog variables, start `npm run dev`, and open the browser's PostHog debug/network view.
2. While signed out, search `data fetching`. Confirm results render and one `search_performed` arrives with the scrubbed query, accurate counts, and an anonymous distinct ID that matches the browser session.
3. Search an unmatched phrase and then trigger a recoverable search error. Confirm `search_zero_results` and `search_failed` behavior, with no internal error string or raw failed query on the failure event.
4. Search text containing a sample email, phone, URL, handle, IPv4, and IPv6 value. Confirm direct identifiers are replaced in the captured successful query.
5. Change sorting and open a lesson result, then a video moment from each card link region. Confirm one `search_sort_changed` per change and one `search_result_opened` per navigation with the visible rank and result type.
6. Sign in through Clerk, repeat a search, and confirm both browser and server events use the Clerk user ID. Sign out and confirm subsequent events use a reset anonymous identity.
7. Open one lesson for each available provider. Start playback and cross the 25, 50, 75, 90, and end thresholds. Confirm `video_played`, one event for each crossed depth milestone, and `video_completed`; replaying or seeking back must not duplicate milestones during that page load.
8. Open a video search result at a timestamp. Confirm the player starts there and no `resume_used` event appears.
9. Select Lesson Content and Notes, then open a resource. Confirm the canonical interaction events contain only allowlisted IDs/slugs, tab/resource type, and stable resource index/key.
10. Confirm no `lesson_completed` event is emitted by the current presentational progress UI. When persisted progress exists, complete a lesson and use its resume action, then confirm each server event occurs only after the corresponding write/read succeeds.

## Implementation and verification results

- Added a typed event contract, direct-identifier query scrubber, Clerk/PostHog identity bridge, and failure-tolerant immediate server capture linked through PostHog tracing headers.
- Moved successful, zero-result, and failed search outcome capture to the search route through Next.js `after()`. The browser no longer duplicates `search_performed`.
- Added visible result rank, sort, stable IDs, match source, and timestamp to `search_result_opened`; added `search_sort_changed`.
- Replaced iframe-load engagement with YouTube IFrame API, Vimeo Player SDK, and Bunny Player.js play, milestone, completion, and bounded failure events.
- Added lesson tab and resource events without titles, descriptions, or URLs. Removed display copy from existing custom analytics properties and stopped reporting the presentational bookmark as saved.
- Added PostHog URL query masking for `q`, masked all replay inputs, and masked the rendered search heading so the raw URL/DOM does not bypass custom query redaction.
- Added server-only typed contracts for `resume_used` and `lesson_completed`. No current event is emitted because this checkout has no persisted progress route, completion mutation, or real resume affordance.
- `npx tsc --noEmit`: passed before implementation and after final changes.
- `npm run lint`: passed before implementation and after final changes.
- `npm run build`: passed after final changes. The first restricted build compiled and type-checked but could not finish static page generation; the permitted rerun generated all six static pages.
- Development server: started successfully on port 3001 because the user's existing server held port 3000. Restored the original server lock after stopping the verification server.
- Live home route: HTTP 200 with the expected Lopsis title. Invalid search: HTTP 400 with the existing safe validation response.
- Live MCP-backed `data fetching` search: HTTP 200, 355 grounded results across ten courses (39 lessons and 316 video moments); every result included a stable lesson ID for analytics.
- Representative timestamped YouTube lesson: HTTP 200 and retained `enablejsapi=1` start-capable embed output.
- Query scrubber checks passed for ordinary text, email, phone, URL, account handle, IPv4, full IPv6, and compressed IPv6 examples.
- Scoped `git diff --check`: passed. Whole-worktree diff check still reports the pre-existing blank line at the end of the user's modified `sanity.types.ts`.
- This environment had no installed browser automation package, so actual provider play/milestone callbacks and PostHog dashboard ingestion still require the manual browser steps above.
