# Publish progress, bookmarks, and course review fixes as a stacked pull request

## Goal

Create a new branch stacked on `docs/prompt-sequencing-and-agent-build-plan`, commit all changes separately by context using conventional commit messages, push to `origin`, and open a stacked pull request targeting `docs/prompt-sequencing-and-agent-build-plan` while preserving the open PR #13.

## Skills and documentation read

- Repository `AGENTS.md`, specifically Section 2 (loop, prompts, and approval), Section 5 (responsibilities and boundaries), Section 13 (checks to run), and previous stacked PR workflows (`prompts/34-publish-review-fixes-pr.md`, `prompts/38-publish-player-and-search-review-fixes-pr.md`).
- GitHub CLI manual for `gh pr create` with `--base` and `--head`.

## Repository state inspected

- Current branch: `docs/prompt-sequencing-and-agent-build-plan`.
- Open PR: PR #13 (`feat: learner progress tracking, bookmarks, and course detail interactivity`), targeting `main`.
- Uncommitted files in working tree:
  - `app/api/progress/route.ts` (malformed JSON 400 response, revision-guarded patch with retry)
  - `lib/progress/progress-provider.tsx` (per-course mutation sequence tracking, scoped rollback, auth change reset)
  - `components/course-page.tsx` (strictly scoped `activeResumeLessonId` without targetLesson fallback)
  - `lib/bookmarks/use-bookmarks.ts` (safe storage read helper, cross-tab synchronized mutations)
  - `lib/bookmarks/bookmarks.test.ts` (unit tests for `readSafeBookmarks` under SSR and SecurityError conditions)
  - `prompts/43-fix-review-findings-progress-bookmarks-course.md` (implementation prompt for review fixes)
  - `prompts/44-publish-progress-and-bookmarks-review-fixes-pr.md` (this publication workflow prompt)

## Decisions and assumptions

1. **Branch creation**: Create and switch to a new branch `fix/review-findings-progress-and-bookmarks` branched directly from `docs/prompt-sequencing-and-agent-build-plan`.
2. **Contextual commits**: Split working tree changes into 5 focused commits:
   - **Commit 1 (`fix(api)`)**: `fix(api): handle malformed json and add revision guard for progress updates` covering `app/api/progress/route.ts`.
   - **Commit 2 (`fix(progress)`)**: `fix(progress): scope error rollback per course and clear state on auth change` covering `lib/progress/progress-provider.tsx`.
   - **Commit 3 (`fix(course)`)**: `fix(course): isolate active resume indicator from navigation target lesson` covering `components/course-page.tsx`.
   - **Commit 4 (`fix(bookmarks)`)**: `fix(bookmarks): serialize mutations across tabs and add safe storage helper` covering `lib/bookmarks/use-bookmarks.ts` and `lib/bookmarks/bookmarks.test.ts`.
   - **Commit 5 (`docs(prompts)`)**: `docs(prompts): document progress and bookmarks review fixes and pr publication` covering prompt files `prompts/43-*` and `prompts/44-*`.
3. **Stacked PR strategy**: Open the new pull request with `--base docs/prompt-sequencing-and-agent-build-plan` and `--head fix/review-findings-progress-and-bookmarks`. This guarantees PR #13 remains open and untouched, while the new PR isolates only the review-fix delta.
4. **Pull Request title & body**:
   - Title: `fix: address progress, bookmarks, and course resume review findings`
   - Body: Succinct description of the revision-guarded progress patch, malformed JSON 400 status, scoped progress rollback, cross-tab bookmark mutation serialization, curriculum resume indicator isolation, and test coverage.

## Files expected to include across commits

- `app/api/progress/route.ts`
- `lib/progress/progress-provider.tsx`
- `components/course-page.tsx`
- `lib/bookmarks/use-bookmarks.ts`
- `lib/bookmarks/bookmarks.test.ts`
- `prompts/43-fix-review-findings-progress-bookmarks-course.md`
- `prompts/44-publish-progress-and-bookmarks-review-fixes-pr.md`

## Security considerations

- Review `git diff --staged` before each commit to ensure no secret tokens (`SANITY_API_WRITE_TOKEN`, Clerk secret keys) or environment files are staged.
- Push using standard `git push -u origin <branch>`; never use `--force`.

## Acceptance criteria

1. A new local branch `fix/review-findings-progress-and-bookmarks` exists from `docs/prompt-sequencing-and-agent-build-plan`.
2. Five clean, contextual commits are recorded with conventional commit messages.
3. The working tree is completely clean.
4. The branch is pushed to `origin` with upstream tracking.
5. A new pull request is opened targeting `--base docs/prompt-sequencing-and-agent-build-plan`.
6. Open PR #13 remains open and unmodified.

## Checks to run

- `git status`
- `npm run test:unit`
- `npm run lint`
- `npx tsc --noEmit`
- `gh pr view <new-pr-number>`

## Manual test steps

1. Verify `git log -n 5 --oneline` shows the 5 contextual commits.
2. Verify `gh pr list` shows both PR #13 and the new stacked PR.
3. Verify the new PR's base branch is `docs/prompt-sequencing-and-agent-build-plan`.
