# Fix verified player lifecycle and search test review findings

## Goal

Resolve verified review findings across player lifecycle management and search test coverage with minimal changes:
1. Prevent late YouTube callbacks from interacting with destroyed players by checking `disposed` in `onReady`.
2. Ensure the Bunny `ready` listener is stored in `bunnyCleanups` and deregistered on cleanup via `off("ready", ...)`.
3. Extract duplicated `candidatesFromRows` and `createEmbedUrl` logic into a shared module `lib/search/timestamp-resolution.ts`, consuming it from `app/api/search/route.ts`, `components/lesson-video.tsx`, and `lib/search/timestamp-resolution.test.ts`.
4. Add boundary assertions to `lib/search/prompt.test.ts` for 64-character acceptance, 65-character rejection, underscore rejection, and punctuation rejection. Skip uppercase rejection because current code explicitly accepts and normalizes uppercase letters via `normalizedSearchTermSchema`.

## Skills and documentation read

- Repository `AGENTS.md`, specifically loop requirements, client/server boundaries, video embed handling, review finding verification, and required check procedures.
- Next.js 16.3.3 App Router documentation (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`) for client component lifecycle and browser API boundaries.
- Bunny Stream playerjs API and YouTube iframe API documentation for event registration and teardown contracts.

## Current code inspected and finding verification

1. `components/lesson-video.tsx` (Bunny ready listener):
   - In lines 293-299, `bunnyPlayer.on("ready", ...)` attaches an anonymous callback directly without pushing it into `bunnyCleanups`. During cleanup (lines 317), only listeners in `bunnyCleanups` have `bunnyPlayer.off(event, callback)` called. Finding is valid.
2. `components/lesson-video.tsx` (YouTube onReady guard):
   - In lines 244-248, `onReady: (event) => { if (startSeconds > 0) { event.target.seekTo(startSeconds, true); } }` does not check `disposed`. If `onReady` fires asynchronously after component teardown has already set `disposed = true` and called `youtubePlayer?.destroy()`, `seekTo` is invoked on the destroyed player. Finding is valid.
3. `lib/search/timestamp-resolution.test.ts`, `app/api/search/route.ts`, and `components/lesson-video.tsx` (Duplicated helpers):
   - `candidatesFromRows` (and `lessonRelevance`) is duplicated verbatim in `app/api/search/route.ts` (lines 97-134) and `lib/search/timestamp-resolution.test.ts` (lines 10-50).
   - `createEmbedUrl` is duplicated verbatim in `components/lesson-video.tsx` (lines 85-115) and `lib/search/timestamp-resolution.test.ts` (lines 52-91).
   - Moving these to a shared module removes production-test drift. Finding is valid.
4. `lib/search/prompt.test.ts` (Boundary assertions for search terms schema):
   - Lines 19-27 test general array lengths and output shape drift, but do not assert boundary length (64 vs 65 characters) or character rejection (underscore, punctuation).
   - Finding is valid for length boundaries (64-character accepted, 65-character rejected) and character boundaries (underscore and punctuation rejected).
   - Finding is **invalid** for uppercase rejection: in `lib/search/schema.ts`, `normalizedSearchTermSchema` uses regex `^[\p{L}\p{N}]+(?:[ '\-’][\p{L}\p{N}]+)*$/u` and `.transform((term) => term.normalize('NFKC').toLocaleLowerCase())`. The schema intentionally accepts uppercase Unicode letters and normalizes them to lowercase rather than throwing an error. Attempting to assert that uppercase is rejected would break against the current production schema contract. We will verify uppercase normalization instead of rejection and document this distinction.

## Decisions and assumptions

1. **Shared timestamp resolution module**: Create `lib/search/timestamp-resolution.ts` exporting:
   - `createEmbedUrl(videoUrl: string, startSeconds: number): VideoEmbed | null`
   - `type VideoEmbed = { provider: 'YouTube' | 'Vimeo' | 'Bunny'; src: string }`
   - `candidatesFromRows(lessonRows: ReturnType<typeof lessonSearchRowsSchema.parse>, videoRows: ReturnType<typeof videoSearchRowsSchema.parse>): SearchCandidate[]`
   - `formatResultHref(slug: string, kind: 'lesson' | 'video', startSeconds?: number): string`
   This keeps candidate relevance and embed URL logic in one canonical location without introducing server-only dependencies into client components.
2. **Bunny ready listener cleanup**: Define `onReady: BunnyCallback` once, push `["ready", onReady]` to `bunnyCleanups`, and call `bunnyPlayer.on("ready", onReady)`. This guarantees `bunnyPlayer.off("ready", onReady)` executes on unmount/teardown.
3. **YouTube onReady guard**: Add `!disposed` check before invoking `event.target.seekTo(startSeconds, true)`.
4. **Schema boundary assertions**: In `lib/search/prompt.test.ts`, assert:
   - 64-character lowercase term is accepted.
   - 65-character term throws.
   - Underscore term (`'hello_world'`) throws.
   - Punctuation term (`'hello!world'`) throws.
   - Uppercase term (`'System Prompt'`) parses and transforms to lowercase (`'system prompt'`), preserving the existing schema normalization contract while rejecting malformed shapes.
5. **CodeRabbit review**: If available, execute `coderabbit review --agent` after fixes and checks to verify clean state.

## Files expected to touch

- `lib/search/timestamp-resolution.ts` (new shared module)
- `lib/search/timestamp-resolution.test.ts` (import shared helpers, remove local duplicates)
- `app/api/search/route.ts` (import `candidatesFromRows` from shared module, remove local duplicate)
- `components/lesson-video.tsx` (import `createEmbedUrl` and `VideoEmbed` from shared module, fix Bunny ready cleanup and YouTube onReady guard)
- `lib/search/prompt.test.ts` (add boundary and normalization assertions)
- `prompts/37-fix-review-findings-player-and-search-tests.md`

## Requirements

1. Ensure the YouTube player setup in `components/lesson-video.tsx` never calls `seekTo` if `disposed` is true.
2. Ensure the Bunny player setup in `components/lesson-video.tsx` registers its `ready` handler through `bunnyCleanups` so it is deregistered with `bunnyPlayer.off("ready", callback)` on unmount/re-render.
3. Keep `createEmbedUrl` and `candidatesFromRows` single-sourced in `lib/search/timestamp-resolution.ts`.
4. Import and use the shared `candidatesFromRows` in `app/api/search/route.ts`.
5. Import and use the shared `createEmbedUrl` in `components/lesson-video.tsx`.
6. Import and use both shared helpers in `lib/search/timestamp-resolution.test.ts`.
7. Add 64-character acceptance, 65-character rejection, underscore rejection, punctuation rejection, and uppercase normalization assertions in `lib/search/prompt.test.ts`.
8. Do not alter `lib/search/schema.ts` to reject uppercase, as uppercase normalization is intentional for model output robustness.

## Security considerations

- `lib/search/timestamp-resolution.ts` contains only pure functions parsing URLs and ranking candidates; it exposes no secrets and requires no server-only tokens.
- `createEmbedUrl` retains strict HTTPS protocol checking and provider URL hostname/path validation to prevent `javascript:` or arbitrary URL injection into iframes.
- `searchTermsSchema` maintains strict bounded input parsing (1-12 terms, 1-64 chars each) to prevent injection or query blowup.

## Acceptance criteria

1. All 10 existing unit tests plus the newly added assertions pass via `npm run test:unit`.
2. `npx tsc --noEmit` and `npm run lint` pass with zero errors.
3. `npm run build` succeeds without build or bundling regressions.
4. If CodeRabbit is run, any remaining findings are reviewed.

## Checks to run

1. `npm run test:unit`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`
5. `git diff --check`
6. `coderabbit review --agent` (if installed and authenticated)

## Exact manual test steps

1. Run `npm run test:unit` and verify all tests pass, including:
   - 64-char term accepted and 65-char term rejected
   - Underscore and punctuation rejected
   - Uppercase normalized
   - Timestamp resolution and candidate ranking matching shared implementation
   - Embed URL generation matching shared implementation
2. Run `npm run lint` and `npx tsc --noEmit` to verify type safety across client and server boundaries.
3. Run `npm run build` to ensure Webpack compiles both client and server bundles cleanly.
4. Mount a lesson page with start seconds query parameter and inspect that the video player initializes correctly without errors.
