# Implement offline video ingestion pipeline

## Goal

Implement a resilient, provider-aware offline video ingestion pipeline in Lopsis that builds Sanity `video` documents containing timestamped transcript chunks and table-of-contents chapter markers. The pipeline reliably processes YouTube, Vimeo, and Bunny URLs, handles caption extraction with proper language matching and fallback, respects rate limits, generates deterministic datastore IDs, and provides dry-run, force-refresh, and single-slug CLI controls.

## Skills and documentation read

- Repository `AGENTS.md` (sections 1, 5, 7, 8, 9, 11, 12, 13, 14).
- `sanity-best-practices` (`.agents/skills/sanity-best-practices/SKILL.md`) for schema compliance, document references, and Sanity client usage.
- `sanity-migration` (`.agents/skills/sanity-migration/SKILL.md`) for deterministic ID derivation, idempotent updates (`createOrReplace`), and validation reporting.
- Next.js App Router documentation in `node_modules/next/dist/docs/`.

## Existing code and repository state inspected

- `studio/schema-types/documents/video.ts`: Defines `video` document schema with `providerId`, `url`, `sourceTitle`, `chapters` array of `{ startSeconds, label }`, and `chunks` array of `{ startSeconds, text }`.
- `studio/scripts/ingest-videos.ts`: Prototype ingestion tool. Inspection identified the following issues:
  1. Only handles YouTube; Vimeo and Bunny URLs are immediately rejected.
  2. If `player.captions.playerCaptionsTracklistRenderer.captionTracks` is missing from `ytInitialPlayerResponse` (frequent under automated/bot requests), it returns `null` instead of falling back to `fetchCaptionsWithYtDlp`.
  3. `fetchCaptionsWithYtDlp` requests `--sub-langs en-orig,en`, dropping subtitles labeled `en-US`, `en-GB`, or other English dialects.
  4. Concurrent execution with unthrottled workers causes YouTube `HTTP Error 429: Too Many Requests`.
  5. When `yt-dlp` raises an error on a secondary/auto-translated subtitle after downloading primary subtitles, the `finally` block deletes the temp directory without checking for downloaded files.
  6. Lacks a `--force` flag to re-ingest or refresh existing video documents.
- `components/lesson-video.tsx`: Confirmed playback support for YouTube, Vimeo, and Bunny embed URLs with `?start=<seconds>`.
- `lib/search/ground-results.ts`: Consumes `video.chapters` and `video.chunks` to ground search results with specific timestamp links.
- Dataset check: 120 lessons exist in Sanity with video URLs, 114 already have ingested video documents, and 6 lessons had incomplete caption extraction due to the issues above.

## Decisions and assumptions

1. **Multi-Provider Architecture**:
   - **YouTube**: Direct `ytInitialPlayerResponse` extraction for chapters, description timestamps, and captions. If direct captions are absent or fail, gracefully fall back to `yt-dlp` using broad English subtitle matching (`en-orig,en,en-US,en-GB,en.*`). Add retry with exponential backoff on 429 responses.
   - **Vimeo**: Parse Vimeo URLs (`vimeo.com/<id>` or `player.vimeo.com/video/<id>`). Fetch public player config from `https://player.vimeo.com/video/<id>/config`. Extract title, chapters (from description or config), and English text tracks (`request.text_tracks`). Download and parse WebVTT captions into timestamped chunks.
   - **Bunny**: Parse Bunny URLs (`iframe.mediadelivery.net/embed/<libraryId>/<videoId>` or CDN URLs). Parse WebVTT captions or authored chapters where accessible; fail cleanly with descriptive logging if CDN captions require private signing.
2. **WebVTT Caption Parser**:
   - Implement an in-memory WebVTT parser supporting standard timecode formats (`HH:MM:SS.mmm` and `MM:SS.mmm`) to extract cue start seconds and text for chunking.
3. **Deterministic & Safe Document IDs**:
   - Generate IDs as `video.<provider>.v<sanitizedId>.<urlHashPrefix>` ensuring valid characters (`a-z`, `A-Z`, `0-9`, `_`, `-`, `.`).
4. **Transcript Chunking & Chapter Formatting**:
   - Group caption cues into chunks bounded by 30 seconds or 650 characters, ensuring `text.length <= 1200` per schema.
   - Format chapters with non-negative integer `startSeconds` and trimmed `label` (max 240 chars).
5. **Rate Limiting & Concurrency**:
   - Default concurrency to 1 with a configurable delay between video extractions to avoid IP rate-limiting by video providers.
6. **CLI & Workspace Integration**:
   - Support `--dry-run` / `LOPSIS_INGEST_DRY_RUN=1`.
   - Support `--slug=<slug>` / `LOPSIS_INGEST_SLUG=<slug>`.
   - Support `--force` / `LOPSIS_INGEST_FORCE=1`.
   - Support `--concurrency=<num>` / `LOPSIS_INGEST_CONCURRENCY=<num>`.
   - Add root package script `"ingest:videos"` for developer convenience.

## Files expected to touch

- `studio/scripts/ingest-videos.ts`: Implement multi-provider ingestion, WebVTT parsing, robust caption fallback, rate limiting, and CLI options.
- `package.json`: Add convenient `"ingest:videos"` script referencing the studio script.
- `prompts/implement-offline-video-ingestion-pipeline.md`: Implementation prompt.

## Requirements

1. Ingest videos offline without running in the request path.
2. Extract or fall back to captions and format them into timestamped chunks (`startSeconds`, `text`).
3. Extract table-of-contents chapter markers (`startSeconds`, `label`).
4. Derive deterministic document IDs from the normalized video URL.
5. Provide support for YouTube and Vimeo, and handle Bunny URLs gracefully.
6. Support dry-run mode, single-lesson targeting by slug, and force-refresh.
7. Avoid provider rate-limiting by throttling requests.
8. Maintain idempotent upserts (`client.createOrReplace`).

## Security considerations

1. The script runs strictly offline; never expose tokens or private data in logs.
2. Sanity writes use CLI authenticated tokens (`--with-user-token`) or server-side write tokens.
3. Keep subprocess calls parameter-based (`execFileAsync`) to prevent shell injection.
4. Temporary directories created for `yt-dlp` must be cleaned up in all code paths.

## Acceptance criteria

1. Ingestion script runs successfully against all lessons with video URLs without crashing.
2. Captions from YouTube and Vimeo are correctly downloaded, parsed, and converted to timestamped chunks.
3. Chapters are extracted from player markers or description timestamps.
4. Output documents conform to the Sanity `video` schema with non-negative integer `startSeconds` and validated field lengths.
5. Missing lessons that previously failed due to rate limits or dialect codes ingest successfully.
6. Dry-run mode (`--dry-run` or `LOPSIS_INGEST_DRY_RUN=1`) previews actions without mutating Sanity.
7. TypeScript checks pass in both `web` and `studio` workspaces, and ESLint passes.

## Checks to run

1. `git diff --check`
2. `npx tsc --noEmit` from root workspace.
3. `npm run lint` from root workspace.
4. `npm run typecheck` from `studio` workspace.
5. Ingestion verification in dry-run mode for targeted lessons.
6. Ingestion run for any remaining uningested lessons.
7. Query Sanity to confirm all valid captioned videos have corresponding `video` documents.

## Exact manual test steps

1. Run dry-run for a specific YouTube lesson:
   `LOPSIS_INGEST_DRY_RUN=1 LOPSIS_INGEST_SLUG=nextjs-app-router-in-depth-file-system-routing npm run ingest:videos`
   Verify it outputs chapter count and chunk count without writing to Sanity.
2. Run live ingestion for previously skipped lessons (e.g. `LOPSIS_INGEST_SLUG=python-for-data-work-comprehensions npm run ingest:videos`) and verify it writes chapters and chunks successfully.
3. Query Sanity for the newly created video documents using GROQ:
   `npx sanity documents query '*[_type == "video" && url match "*YlY2g2xrl6Q*"]{_id, url, sourceTitle, "chapterCount": count(chapters), "chunkCount": count(chunks)}'`
   Confirm the document contains valid chapters and chunks.
4. Verify root and Studio typechecks pass cleanly.
