# Publish verified review fixes as a stacked pull request

## Goal

Stage all current Lopsis review-fix changes, commit them on a new branch, push that branch to `origin`, and open a focused stacked pull request without modifying the already-open PR #8.

## Skills and documentation read

- Repository `AGENTS.md`, especially the prompt approval, validation, and concise handoff requirements.
- No implementation skill is needed because this task only publishes the already-approved and validated local changes.

## Repository state inspected

- Current branch: `fix/video-start-caption-fallback`.
- Current branch is already pushed and is the head of open PR #8, `feat: expand video ingestion, search, and analytics`.
- PR #8 targets `main` and currently has passing checks.
- Current uncommitted scope contains the six requested fixes, the privacy regression test, package metadata, and implementation prompt.

## Decisions and assumptions

1. Create `fix/review-video-analytics-ingestion` from the current `fix/video-start-caption-fallback` HEAD.
2. Stage all current changes, including both prompt files and the new regression test.
3. Commit with `fix: address video and analytics review findings`.
4. Push the new branch to `origin` and set upstream tracking.
5. Open a non-draft stacked PR targeting `fix/video-start-caption-fallback`, not `main`, so the new PR contains only the review-fix delta while PR #8 remains open.
6. Use the title `fix: address video and analytics review findings`.
7. Include a concise PR body summarizing iframe remounting, PostHog reset behavior, privacy redaction coverage, Bunny ingestion, URL normalization, concurrency validation, and completed checks.
8. Do not amend, force-push, close, retarget, or otherwise mutate PR #8.

## Files expected to include in the commit

- `components/lesson-video.tsx`
- `components/posthog-identity.tsx`
- `lib/analytics/privacy.ts`
- `lib/analytics/privacy.test.ts`
- `studio/scripts/ingest-videos.ts`
- `package.json`
- `package-lock.json`
- `prompts/fix-review-findings-video-analytics-ingestion.md`
- `prompts/publish-review-fixes-pr.md`

## Security considerations

- Review the staged diff for secrets before committing.
- Do not include `.env.local`, tokens, generated credentials, or unrelated files.
- Use a normal push; never force-push.
- Do not approve paid CodeRabbit usage or authenticate external services.

## Acceptance criteria

1. A new local branch exists from the current PR #8 head.
2. All and only current intended changes are staged and committed.
3. The commit has no secret-bearing or unrelated files.
4. The new branch is pushed to `origin` with upstream tracking.
5. A new non-draft PR exists with base `fix/video-start-caption-fallback` and the expected title/body.
6. PR #8 remains open and unchanged.
7. The final working tree is clean.

## Checks to run

1. `git diff --check` before staging.
2. Review `git status --short` and `git diff --stat`.
3. Inspect the staged file list and staged diff summary.
4. Scan the staged diff for common credential patterns.
5. Verify the commit with `git show --stat --oneline HEAD`.
6. Verify upstream tracking with `git status --short --branch`.
7. Verify the new PR base, head, URL, and state with GitHub CLI.
8. Confirm PR #8 remains open.

## Exact manual test steps

1. Open the new PR URL and confirm its base is `fix/video-start-caption-fallback`.
2. Confirm the Files changed tab contains only the review-fix delta.
3. Confirm PR #8 still targets `main` and remains open.
4. Confirm CI starts for the new PR and review its results.
