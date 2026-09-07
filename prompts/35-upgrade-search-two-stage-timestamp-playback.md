# Upgrade search with two-stage timestamp resolution and on-site timestamped playback

## Goal

Upgrade the Lopsis intelligent search and playback experience with robust two-stage timestamp resolution (chapters first, transcript fallback) and guaranteed on-site timestamped playback across all supported video providers (YouTube, Vimeo, Bunny). Search result cards must deep link to `/lessons/[slug]?start=<seconds>` at the matched second, and the embedded player must seek directly to that second upon initialization and navigation.

## Skills and guidance read

- Repository `AGENTS.md` (sections 1, 2, 5, 7, 8, 9, 10, 11, 12, 13, 14), specifically:
  - Section 7: "Timestamps resolve in two stages. Match the chapters (the table of contents) first, and fall back to matching the transcript only if no chapter matches. Chapter labels are clean, and transcript text is the noisier backstop."
  - Section 7: "Playback stays on the site through a provider embed. Videos are YouTube, Vimeo, or Bunny embeds shown on the lesson page with the provider's own player. Do not build a custom player. A result links to the lesson page with a start seconds query param, and the embed starts at that second using the provider's own start parameter. Never send the learner out to the provider."
  - Section 9: "The supported providers are YouTube, Vimeo, and Bunny, each shown as an embed on the lesson page. Ingestion is specific to each provider: to support one you need a way to turn its captions into chunks, a source of chapters or authored ones, and a playback and seek case for its embed. Do not treat a provider as supported until both ingestion and playback exist for it."
  - Section 11: "For a query, search both ways and merge: match lessons on their topic (title and notes), and match video moments (chapters first, then transcript, per section 7). Rank by specificity, so a title that contains the exact concept beats a broad keyword hit."
  - Section 12: "Never return a whole transcript or chunks array to the model. It overflows the context window. Fetch only the filtered matches, a few per video."
- `sanity-best-practices` (`.agents/skills/sanity-best-practices/SKILL.md`) for GROQ filtering and projection boundaries.
- `create-agent-with-sanity-context` (`.agents/skills/create-agent-with-sanity-context/SKILL.md`) for Sanity Context MCP integration.
- `dial-your-context` (`.agents/skills/dial-your-context/SKILL.md`) for Context instructions and dataset rules.
- Next.js 16 App Router documentation in `node_modules/next/dist/docs/`.

## Code and repository state inspected

- `app/api/search/route.ts`:
  - Builds fixed GROQ query `buildVideoQuery` for video chapters and transcript chunks.
  - In GROQ, if a video document has no `chapters` field (or `chapters` is null), `count(chapters[...])` evaluates to `null`. In GROQ, `null == 0` evaluates to `false`, causing `select(count(...) == 0 => chunks[...], [])` to return `[]` and failing to fall back to transcript chunks for videos lacking chapters.
  - In GROQ, `chapters[${chapterFilter}]` returns `null` if `chapters` is null, violating the non-nullable array expectation of `videoSearchRowsSchema`.
  - Candidate generation in `candidatesFromRows` respects the two-stage preference: when `row.chapterMatches.length > 0`, it takes chapter moments and sets `matchSource: 'chapter'`; otherwise it takes `row.chunkMatches` and sets `matchSource: 'chunk'`.
  - Scoring prioritizes title exact match (100) > chapter exact label (98) > title match (90–94) > chapter label match (88) > lesson key points (75–79) > transcript chunk match (70) > notes match (60).
- `lib/search/ground-results.ts`:
  - Grounds candidate moments against Sanity video documents (`video.chapters` and `video.chunks[startSeconds in $startSeconds]`).
  - Sets `clipLengthSeconds` for chapter moments using the next chapter's start or lesson duration; leaves it `null` for transcript chunks without guessing.
  - Formats video cards with the exact matched `startSeconds`.
- `components/search-page.tsx`:
  - Renders `ResultCard` for each result.
  - For `video` results, derives `href = /lessons/${encodeURIComponent(result.lessonSlug)}?start=${result.startSeconds}`.
  - Deep links all three clickable areas (poster link, card title, and footer "Watch from MM:SS" action) to `href`.
- `app/lessons/[slug]/page.tsx` & `components/lesson-page.tsx`:
  - Parses `start` search parameter with integer validation and duration bounds.
  - Passes `startSeconds` to `LessonVideo`.
- `components/lesson-video.tsx`:
  - Generates embed URLs for YouTube, Vimeo, and Bunny.
  - Bunny embed URL currently uses `?start=${start}`, whereas Bunny's documented start parameter is `?t=${start}` (MediaDelivery iframe player).
  - Embed player SDK connections currently lack explicit seek calls:
    - YouTube SDK `onReady` does not invoke `seekTo(startSeconds, true)`.
    - Vimeo SDK does not invoke `vimeoPlayer.setCurrentTime(startSeconds)` on ready.
    - Bunny SDK does not invoke `bunnyPlayer.setCurrentTime(startSeconds)` on ready.
- `lib/analytics/privacy.test.ts`:
  - Existing unit test runner setup with `tsx --test`.

## Decisions and assumptions

1. **Robust Two-Stage Timestamp Resolution in GROQ**:
   - In `buildVideoQuery`, wrap chapter counting and filtering in `coalesce`:
     `"chapterMatches": coalesce(chapters[${chapterFilter}] { startSeconds, "exactLabelMatch": lower(label) == ${exactQuery} }, [])`
     `"chunkMatches": select(coalesce(count(chapters[${chapterFilter}]), 0) == 0 => coalesce(chunks[${chunkFilter}][0...5] {startSeconds}, []), [])`
   - This ensures that videos with missing, null, or empty chapter arrays cleanly fall back to matching transcript chunks (capped at 5 chunks per video), while videos with matching chapters return those chapters and suppress chunks.
2. **Schema Defense-in-Depth**:
   - In `lib/search/schema.ts`, allow `chapterMatches` and `chunkMatches` in `videoSearchRowsSchema` to default or coalesce safely to empty arrays if nullish.
3. **Multi-Provider Embedded Player Seeking**:
   - Provide both embed URL parameters and explicit SDK seek triggers for all three supported providers:
     - **YouTube**: Use `?start=${start}&rel=0&enablejsapi=1&playsinline=1` embed URL; in `onReady`, if `startSeconds > 0`, call `event.target.seekTo(startSeconds, true)`. Add `seekTo` to `YouTubePlayerInstance`.
     - **Vimeo**: Use `#t=${start}s` embed URL; in `connectPlayer`, when `vimeoPlayer.ready()` resolves, if `startSeconds > 0`, call `vimeoPlayer.setCurrentTime(startSeconds)`.
     - **Bunny**: Use `?t=${start}&start=${start}` embed URL; when `bunnyPlayer` triggers `ready`, if `startSeconds > 0` and `setCurrentTime` is available, call `bunnyPlayer.setCurrentTime(startSeconds)`.
4. **Deep Linking Verification and Coverage**:
   - Ensure all video card links (poster thumbnail, title, footer action button) retain the `?start=<seconds>` parameter.
   - Add unit tests verifying:
     - Two-stage timestamp resolution logic: chapter matches suppress chunk matches; missing chapters fall back to chunks; chapter matches score higher than chunk matches.
     - Deep link URL formation for video vs lesson results.
     - Provider embed URL generation and start parameter formatting for YouTube, Vimeo, and Bunny.

## Files expected to touch

- `app/api/search/route.ts`
- `lib/search/schema.ts`
- `components/lesson-video.tsx`
- `lib/search/timestamp-resolution.test.ts` (new unit test file)
- `prompts/upgrade-search-two-stage-timestamp-playback.md`

## Requirements

1. **Two-Stage Timestamp Resolution**:
   - For every video, search chapter labels first.
   - If one or more chapters match the search terms, return those chapter moments. Suppress transcript chunks for that video.
   - If no chapters match for that video (or the video has no chapters), fall back to matching transcript chunks (up to 5 per video).
   - In GROQ, safely handle documents with null, undefined, or empty `chapters` and `chunks` arrays without failing queries or producing null fields.
   - Prioritize chapter matches over transcript chunk matches in candidate relevance scoring.
2. **On-Site Timestamped Playback & Deep Linking**:
   - Result cards for video moments must deep link to `/lessons/[slug]?start=<seconds>`.
   - The lesson route parses `start` and passes `startSeconds` to `LessonVideo`.
   - The embed URL for the provider includes the provider's native start parameter (`start` for YouTube, `#t=...s` for Vimeo, `t` for Bunny).
   - The embedded player SDK explicitly seeks to `startSeconds` when the player is ready.
   - Video playback remains strictly on-site in the embedded player; learners are never redirected to external provider sites.
3. **Analytics & Privacy Preservation**:
   - Preserve existing PostHog events (`searchResultOpened`, `lessonViewed`, `videoPlayed`) with accurate `start_seconds` and `match_source`.
   - Never expose API keys, tokens, or raw learner queries unsanitized.

## Security considerations

- All Sanity read tokens, Context MCP connections, and Gemini API keys remain strictly server-side.
- The browser only receives validated, sanitized search response JSON with relative internal lesson URLs (`/lessons/[slug]?start=<seconds>`).
- Subprocess, external URLs, and embed URLs are strictly validated against HTTPS and known provider hostnames.
- No client-side Sanity or LLM tokens are introduced.

## Acceptance criteria

1. A search matching a video's chapter label returns that chapter moment with `matchSource: 'chapter'` and suppresses transcript chunks for that video.
2. A search matching only a video's transcript text returns transcript moments with `matchSource: 'chunk'` (capped at 5).
3. A video without chapters gracefully falls back to transcript chunk matching when terms match its chunks.
4. Clicking any link on a video result card (poster, title, or action button) opens `/lessons/[slug]?start=<seconds>`.
5. The lesson page initializes the player embed with the requested start time, and the player SDK seeks to `startSeconds`.
6. Unit tests cover two-stage candidate resolution, relevance hierarchy, deep link URLs, and provider embed URLs.
7. `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and Studio typecheck pass cleanly.

## Checks to run

1. `npm run test:unit`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `npm --prefix studio run typecheck`
6. `git diff --check`
7. Dev server test / representative query verification for chapter-first vs transcript-fallback resolution.

## Exact manual test steps

1. Run `npm run test:unit` to verify the automated suite passes.
2. Start the dev server (`npm run dev`) and navigate to `http://localhost:3000/search?q=agent%20loops`.
3. Confirm video results include chapter moments (e.g. from the Building AI Apps with LLMs course) with `matchSource: 'chapter'` and no duplicate transcript chunks from that same video.
4. Search for a term that appears only in a transcript chunk (e.g. `caching and rate limits` or a phrase unique to video dialogue). Confirm video results include transcript chunk moments with `matchSource: 'chunk'`.
5. Click on the video card's "Watch from MM:SS" button; verify the browser opens `/lessons/<slug>?start=<seconds>`.
6. Verify the video player iframe renders with the start parameter in the URL and the player seeks to the matched second upon loading.
7. Click the card poster and title on other search results; confirm all deep link to the lesson with the corresponding `?start=` timestamp.
