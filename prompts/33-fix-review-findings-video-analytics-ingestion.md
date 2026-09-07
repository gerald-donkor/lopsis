# Fix verified video, analytics, and ingestion review findings

## Goal

Apply the six still-valid review fixes with minimal changes: remount React-owned player iframes across playback-effect changes, reset PostHog for every loaded signed-out state, broaden phone redaction to punctuation boundaries with regression coverage, normalize both sides of video-ingestion skip checks, ingest public Bunny caption tracks while explaining private-track failures, and guarantee a finite positive ingestion worker count.

## Skills and documentation read

- Repository `AGENTS.md`, especially the prompt-approval workflow, client/server boundaries, offline video pipeline rules, security requirements, and validation expectations.
- `sanity-best-practices` (`.agents/skills/sanity-best-practices/SKILL.md`) for Sanity document and external-video handling constraints.
- Next.js 16.3.3 App Router guide `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` for client lifecycle and browser API boundaries.
- Official Bunny Stream documentation for public play metadata, caption metadata, chapters, and predictable public caption URLs.
- CodeRabbit CLI documentation at `https://docs.coderabbit.ai/cli` for local agent-mode review behavior.

## Current code inspected and finding verification

- `components/lesson-video.tsx`: the playback effect captures the current iframe, while YouTube and Vimeo teardown can remove it. Because the iframe currently has no dependency-derived React key, the next effect setup can receive the detached element. Finding is valid.
- `components/posthog-identity.tsx`: signed-out reset is guarded by `identifiedUserId.current`, so a fresh/reloaded signed-out client does not reset persisted PostHog identity. Finding is valid.
- `lib/analytics/privacy.ts`: `PHONE_PATTERN` only accepts start-of-string or whitespace before a number, so punctuation-prefixed values such as `Call:+1 202-555-0100` are not redacted. Finding is valid.
- No repository unit-test setup currently exists. A focused TypeScript test and explicit `tsx` test script are the smallest maintainable regression path; `tsx` is already present transitively but will be declared directly for reliable test execution.
- `studio/scripts/ingest-videos.ts`: `existingUrls` contains stored canonical URLs but lookup uses raw lesson URLs; equivalent provider URLs can therefore be reprocessed. Finding is valid.
- `studio/scripts/ingest-videos.ts`: `fetchBunny` is a stub returning `null`, despite parsed public Bunny URLs and existing WebVTT helpers. Finding is valid.
- `studio/scripts/ingest-videos.ts`: `Math.max(1, NaN)` is `NaN`, leading to a zero-length worker array. Finding is valid.

## Decisions and assumptions

1. Give the iframe a stable key derived from every playback-effect input. When any input changes, React commits a fresh iframe before the new passive-effect setup reads `iframeRef.current`; the cleanup closure still tears down the old YouTube/Vimeo/Bunny player.
2. Keep PostHog identify deduplication, but make the loaded signed-out branch always call `posthog.reset()` and then clear the ref.
3. Change the phone start boundary to accept start-of-string or a preceding non-alphanumeric character without consuming that character. Preserve the existing trailing boundary, number shape, redaction token, normalization order, and output limit.
4. Add focused regression cases for colon/punctuation-prefixed international and domestic phone numbers and assert sanitized analytics input contains `[phone]` without the original number.
5. Parse concurrency once, accept only finite positive integers, and otherwise use the existing default of `2`. Keep `workerCount` bounded by lesson count.
6. Normalize every stored video URL that can be parsed and normalize each lesson URL before membership lookup. Preserve unparseable stored values as-is and preserve `--force` bypass behavior.
7. For Bunny, split the parsed provider ID into library/video IDs, fetch public play metadata from Bunny’s documented play endpoint, select English captions first and otherwise the first caption, derive the public caption URL from the returned playlist origin, download WebVTT, and reuse the existing parser/chunker. Map returned title and chapters into the existing `ExtractedVideo` contract.
8. If Bunny reports token authentication or rejects play/caption access with authorization status, throw a descriptive private/signed-caption error. Other provider failures retain status-specific errors, while no caption track returns `null` so `processLessons` keeps its existing skip contract.
9. Run CodeRabbit agent review only if the binary is installed and already authenticated. Do not install it, initiate browser authentication, or consent to paid credits as part of this task.

## Files expected to touch

- `components/lesson-video.tsx`
- `components/posthog-identity.tsx`
- `lib/analytics/privacy.ts`
- `lib/analytics/privacy.test.ts` (new)
- `studio/scripts/ingest-videos.ts`
- `package.json`
- `package-lock.json`
- `prompts/33-fix-review-findings-video-analytics-ingestion.md`

## Requirements

1. Remount a React-owned iframe before playback initialization reruns for every playback-effect input change.
2. Preserve YouTube/Vimeo destroy calls, Bunny listener cleanup, timer cleanup, and disposed guards.
3. Reset PostHog for every loaded signed-out effect state, independent of the in-memory identity ref.
4. Redact punctuation-prefixed phone numbers without weakening the trailing boundary or consuming surrounding punctuation.
5. Ensure stored and lesson video URLs are compared in equivalent normalized form while `force` still bypasses skips.
6. Ingest accessible public Bunny WebVTT captions and chapters into the existing extracted-video shape.
7. Fail descriptively for private/signed Bunny caption access without exposing tokens or URLs containing credentials in logs.
8. Guarantee concurrency and worker count are finite non-negative integers, with a positive worker count whenever lessons are non-empty.
9. Keep all changes within the current browser analytics and offline Studio ingestion boundaries.

## Security considerations

- Do not add client-side secrets or move ingestion into the request path.
- Do not log signed Bunny tokens, caption URLs, API keys, or response bodies.
- Use only provider-derived HTTPS origins and validated parsed IDs when constructing Bunny requests.
- Do not add Bunny API credentials; public captions are ingested anonymously and private tracks are rejected descriptively.
- Keep analytics sanitization deterministic and perform redaction before the sanitized value is captured.

## Acceptance criteria

1. Changing any playback-effect input results in a new iframe DOM node being available to the next player initialization.
2. Player teardown behavior remains intact and no SDK is initialized against the detached prior iframe.
3. A loaded signed-out state calls `posthog.reset()` even when the local identified-user ref is `null`.
4. `Call:+1 202-555-0100` and comparable punctuation-prefixed numbers sanitize to a value containing `[phone]` and not the phone digits.
5. Equivalent raw/canonical lesson and stored video URLs are recognized as already ingested unless forced.
6. Invalid concurrency values such as empty input, `NaN`, zero, negatives, decimals, and infinities cannot prevent workers from running for non-empty lesson lists.
7. A public Bunny video with captions returns timestamped chunks and available chapters; inaccessible signed/private captions produce a clear error.
8. Unit tests, root typecheck, lint, production build, Studio typecheck, and diff checks pass, or any environment-only failure is reported exactly.

## Checks to run

1. `npm run test:unit`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `npm run typecheck` from `studio/`
6. `git diff --check`
7. Start `npm run dev`, verify it reaches ready state, then stop it.
8. If a suitable public Bunny lesson exists and credentials/network permit, run a targeted dry-run ingestion and verify nonzero caption chunks without writing.
9. If CodeRabbit is installed and authenticated, run `coderabbit review --agent --uncommitted`, evaluate only findings that still apply to current code, and rerun relevant checks after any justified fix.

## Exact manual test steps

1. Run `npm run test:unit`; confirm punctuation-prefixed phone values are redacted.
2. Open a lesson with a YouTube video, then navigate or change the start query so the playback effect changes; confirm the new iframe initializes and the old player is torn down.
3. Repeat with a Vimeo lesson.
4. Sign in, verify PostHog identifies the Clerk user, sign out, and confirm the anonymous PostHog identity is reset. Reload while signed out and confirm reset runs again.
5. Run video ingestion with `LOPSIS_INGEST_CONCURRENCY=invalid` and a targeted public captioned lesson in dry-run mode; confirm at least one worker processes it using the default concurrency.
6. Run targeted Bunny ingestion in dry-run mode for a public captioned Bunny lesson; confirm reported chunks are greater than zero and chapters are retained when present.
7. Run the same dry-run against a private/token-authenticated Bunny video; confirm it skips with a descriptive private/signed-caption message and does not print credentials.
8. Run without `--force` for a lesson whose stored video URL is canonical but lesson URL is an equivalent provider form; confirm it reports `Already ingested`. Repeat with `--force` and confirm it attempts extraction.
