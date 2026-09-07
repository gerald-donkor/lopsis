# Update stacked pull request #14 with verified review fixes for bookmarks and progress

## Goal

Maintain all verified review fixes across bookmark storage error resilience and learner progress concurrency on the existing stacked pull request branch `fix/review-findings-progress-and-bookmarks`, ensuring the PR description reflects all latest contextual commits and test verifications against the unmerged base PR #13 (`docs/prompt-sequencing-and-agent-build-plan`).

## Skills and documentation read

- Repository `AGENTS.md`, specifically Section 2 (loop, prompts, and approval), Section 5 (responsibilities and boundaries), Section 13 (checks to run), and previous stacked PR workflows (`prompts/34-publish-review-fixes-pr.md`, `prompts/38-publish-player-and-search-review-fixes-pr.md`, `prompts/44-publish-progress-and-bookmarks-review-fixes-pr.md`).
- GitHub CLI manual for `gh pr edit` and `gh pr view`.

## Repository state inspected

- Current branch: `fix/review-findings-progress-and-bookmarks`.
- Target base branch: `docs/prompt-sequencing-and-agent-build-plan` (head of open PR #13 targeting `main`).
- Existing stacked PR: PR #14 (`fix: address progress, bookmarks, and course resume review findings`), open and targeting PR #13.
- All new changes are committed separately by context:
  1. `fix(bookmarks): retain in-memory snapshot and dispatch on storage errors` (`lib/bookmarks/use-bookmarks.ts`, `lib/bookmarks/bookmarks.test.ts`)
  2. `fix(progress): fence mutations by auth identity and preserve completed lessons on position save` (`lib/progress/progress-provider.tsx`, `lib/progress/progress.test.ts`)
  3. `docs(prompts): document progress and bookmarks review fixes implementation prompt` (`prompts/45-fix-review-findings-progress-and-bookmarks.md`)
- Remote branch `origin/fix/review-findings-progress-and-bookmarks` is fully up-to-date with local branch.

## Decisions and assumptions

1. **Retain PR #14 as the stacked pull request**: Per user decision, keep all contextual commits in PR #14 rather than opening an unnecessary second stacked PR (#15), preserving PR review history and resolving existing CodeRabbit review threads directly.
2. **Update PR #14 description**: Update the PR body to reflect the additional hardening:
   - Bookmark mutation cache and event dispatch resilience when `localStorage.setItem` throws (`QuotaExceededError` or `SecurityError`).
   - `authGenerationRef` fencing preventing stale in-flight mutations and rollbacks from crossing user identity boundaries.
   - Position-owned field merging during `savePosition` response and error rollback, preserving `completedLessonIds`.
   - Updated unit test count (24 passing assertions).
3. **Commit documentation prompt**: Track this workflow prompt as a documentation commit on `fix/review-findings-progress-and-bookmarks` and push to origin.

## Files expected to touch and commit

- `prompts/46-update-progress-and-bookmarks-review-fixes-pr.md`

## Security considerations

- Verify no sensitive tokens or environment variables are included in commit or PR descriptions.
- Use standard `git push`; never use `--force`.

## Acceptance criteria

1. PR #14 is confirmed open with base `docs/prompt-sequencing-and-agent-build-plan` and head `fix/review-findings-progress-and-bookmarks`.
2. All 3 contextual commits plus the documentation commit are present on `origin/fix/review-findings-progress-and-bookmarks`.
3. PR #14 body is updated with accurate descriptions of the latest fixes and verification results.
4. `npm run test:unit`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass with zero errors.

## Checks to run

- `npm run test:unit`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Manual test steps

1. View PR #14 on GitHub CLI (`gh pr view 14`) and verify the updated body, commits, and base branch.
2. Verify PR #13 remains unchanged and open targeting `main`.
