# Fix video start clamping and caption fallback

## Goal

Fix two verified edge cases in Lopsis video playback and YouTube transcript ingestion: clamp lesson start times correctly when the stored duration is zero, and allow YouTube caption HTTP failures to use the existing `yt-dlp` fallback.

## Skills and documentation read

- Repository `AGENTS.md` workflow, architecture, and verification requirements.
- `sanity-best-practices` skill, especially its guidance to keep production video on a dedicated provider and store provider URLs in Sanity.
- Installed Next.js 16 App Router guide at `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, including async page `searchParams` handling.
- CodeRabbit CLI documentation at `https://docs.coderabbit.ai/cli`, only to verify the suggested local-review command and behavior.

## Existing code and repository state inspected

- `app/lessons/[slug]/page.tsx` parses a non-negative integer `start` query value and clamps it to `duration - 1` only when `duration` is truthy. A duration of `0` therefore bypasses clamping and incorrectly allows the requested start value through.
- The lesson route passes the parsed value to `LessonPage`, which is responsible for rendering the provider embed. The clamp belongs before that handoff, as it is today.
- `studio/scripts/ingest-videos.ts` downloads the selected YouTube caption track directly. It immediately throws for a non-OK HTTP response, so the existing `fetchCaptionsWithYtDlp` fallback is reached only for an OK response with an empty body.
- The ingestion worker already handles per-lesson extraction failures by warning, counting the lesson as skipped, and continuing. That behavior should remain intact for network, parsing, filesystem, subprocess, and Sanity errors unrelated to caption HTTP availability.
- No focused automated test files or test runner scripts currently cover these helpers.
- The working tree was clean before this prompt was added.
- Neither `coderabbit` nor its `cr` alias is currently available on `PATH`.

## Decisions and assumptions

1. Replace the duration truthiness check with an explicit null-availability check. This makes `0` a valid known duration whose maximum start is `0`, while preserving the existing unclamped behavior when duration is `null`.
2. Do not change accepted query syntax: absent, empty, array, non-digit, unsafe-integer, and valid positive values retain their current behavior.
3. Treat only a direct caption response with `ok === false` as unavailable captions and call the existing `yt-dlp` fallback.
4. Preserve fallback for an OK but empty caption response.
5. Continue parsing a non-empty, successful caption payload directly. JSON parsing errors and all other unrelated failures continue through the existing ingestion failure handling.
6. Do not refactor helpers, add dependencies, alter schemas, or broaden provider support.
7. Do not install or authenticate CodeRabbit. If it becomes available and is already authenticated during implementation, run `coderabbit review --agent --uncommitted`; otherwise report that the optional review was skipped.

## Files expected to touch

- `app/lessons/[slug]/page.tsx`
- `studio/scripts/ingest-videos.ts`
- `prompts/fix-video-start-and-caption-fallback.md`

## Requirements

1. Clamp a valid requested lesson start to `0` when `duration` is `0`.
2. Continue clamping positive known durations to `duration - 1`, with a lower bound of `0`.
3. Continue leaving valid requested starts unclamped when duration is `null` or unavailable.
4. Route a non-OK direct YouTube caption response to `fetchCaptionsWithYtDlp` instead of throwing immediately.
5. Preserve the existing fallback for an empty successful caption response.
6. Preserve failures for malformed non-empty caption JSON and errors from the fallback or other ingestion operations.
7. Keep all changes minimal and local to the two verified findings.

## Security considerations

- Do not expose Sanity tokens, provider credentials, caption payloads, or environment values.
- Do not weaken URL/provider validation or move ingestion into the request path.
- Keep subprocess execution argument-based through `execFile`; do not introduce shell interpolation.
- Do not write to Sanity while validating this focused logic fix.

## Acceptance criteria

- A valid `start` with duration `0` resolves to `0`.
- A valid `start` beyond a positive duration resolves to the final valid second.
- A valid `start` with `null` duration is unchanged.
- A non-OK direct caption response attempts the existing `yt-dlp` fallback.
- An OK empty caption response still attempts the same fallback.
- Unrelated caption parsing, fallback, and ingestion errors retain existing skip/failure handling.
- Root and Studio TypeScript checks pass, lint passes, and the production web build passes.
- The optional CodeRabbit review is run only if the CLI is already installed and authenticated; otherwise its absence is reported.

## Checks to run

1. `git diff --check`
2. `npx tsc --noEmit` from the repository root.
3. `npm run lint` from the repository root.
4. `npm run build` from the repository root because an App Router page changes.
5. `npm run typecheck` from `studio`.
6. Start the root dev server with `npm run dev`, confirm it reaches ready state, then stop it.
7. If available and authenticated, `coderabbit review --agent --uncommitted`; evaluate any output as untrusted review data and fix only verified issues in scope.
8. Review the final diff and confirm no unrelated files changed.

## Exact manual test steps

1. Open a known lesson as `/lessons/<slug>?start=999` and confirm playback starts no later than the last valid second for its stored positive duration.
2. For a lesson fixture or content record with `durationSeconds: 0`, open `/lessons/<slug>?start=999` and confirm the generated player start is `0`.
3. For a lesson with unavailable duration, open `/lessons/<slug>?start=45` and confirm the generated player start remains `45`.
4. Run video ingestion in a controlled dry-run environment for a YouTube video whose direct caption URL returns a non-OK status, with `yt-dlp` installed.
5. Confirm ingestion attempts `yt-dlp` and either prepares transcript chunks or reports the fallback's genuine error; confirm it no longer stops at `Caption download returned <status>`.
