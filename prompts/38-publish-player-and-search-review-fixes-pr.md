# Publish player lifecycle and search test review fixes as a stacked pull request

## Goal

Create a new branch stacked on `feat/search-timestamps-and-context-tuning`, commit all changes separately by context using conventional commit messages, push to `origin`, and open a stacked pull request targeting `feat/search-timestamps-and-context-tuning` while preserving open PR #10.

## Skills and documentation read

- Repository `AGENTS.md`, specifically the prompt-approval workflow, client/server boundaries, validation requirements, and concise reporting format.
- Previous stacked pull request workflow in `prompts/publish-review-fixes-pr.md`.
- GitHub CLI manual for `gh pr create` and `gh pr view`.

## Repository state inspected

- Current branch: `feat/search-timestamps-and-context-tuning`.
- Existing open PR: PR #10 (`feat: implement two-stage timestamp resolution, player seek, and search prompt tuning`), targeting `main`.
- Uncommitted files in working tree:
  - `components/lesson-video.tsx`
  - `lib/search/timestamp-resolution.ts`
  - `lib/search/timestamp-resolution.test.ts`
  - `app/api/search/route.ts`
  - `lib/search/prompt.test.ts`
  - `prompts/fix-review-findings-player-and-search-tests.md`
  - `prompts/publish-player-and-search-review-fixes-pr.md`

## Decisions and assumptions

1. **Branch creation**: Create and switch to a new branch `fix/review-player-and-search-tests` branched directly from `feat/search-timestamps-and-context-tuning`.
2. **Contextual commits**: Split the working tree changes into 4 focused commits:
   - **Commit 1 (`fix(player)`)**: Guard YouTube `onReady` with `!disposed` and register the Bunny `ready` listener into `bunnyCleanups` for proper teardown in `components/lesson-video.tsx`.
   - **Commit 2 (`refactor(search)`)**: Extract shared candidate relevance ranking (`candidatesFromRows`) and embed URL generation (`createEmbedUrl`, `formatResultHref`) into `lib/search/timestamp-resolution.ts`, updating `app/api/search/route.ts`, `components/lesson-video.tsx`, and `lib/search/timestamp-resolution.test.ts` to consume the shared helpers.
   - **Commit 3 (`test(search)`)**: Add boundary assertions (64-character accept, 65-character reject, underscore and punctuation reject) and uppercase normalization checks to `lib/search/prompt.test.ts`.
   - **Commit 4 (`docs`)**: Track the implementation prompt `prompts/fix-review-findings-player-and-search-tests.md` and this PR workflow prompt `prompts/publish-player-and-search-review-fixes-pr.md`.
3. **Stacked PR strategy**: Open the new pull request with `--base feat/search-timestamps-and-context-tuning` and `--head fix/review-player-and-search-tests`. This ensures the PR delta isolates only the new review fixes against PR #10, without modifying or closing PR #10.
4. **Pull Request title & body**:
   - Title: `fix: address player lifecycle and search test review findings`
   - Body: Succinct description of the player lifecycle teardown fixes, helper deduplication across client/server/tests, search term boundary test additions with uppercase normalization rationale, and checks performed.

## Files expected to touch and commit

- `components/lesson-video.tsx`
- `lib/search/timestamp-resolution.ts`
- `app/api/search/route.ts`
- `lib/search/timestamp-resolution.test.ts`
- `lib/search/prompt.test.ts`
- `prompts/fix-review-findings-player-and-search-tests.md`
- `prompts/publish-player-and-search-review-fixes-pr.md`

## Security considerations

- Ensure no secrets, environment files (`.env.local`), or private tokens are staged or committed.
- Verify `git diff --staged` contains only intended code and documentation changes.
- Push using standard `git push -u origin <branch>`; never force-push.

## Acceptance criteria

1. Four clean, contextual commits exist on the new branch with descriptive conventional commit messages.
2. The working tree is clean after all commits.
3. The new branch is pushed to `origin`.
4. A new pull request is opened targeting `feat/search-timestamps-and-context-tuning`.
5. Existing pull request #10 remains open and untouched.
6. All tests and checks continue to pass on the branch.

## Checks to run

1. `git diff --check`
2. `git status -b --short`
3. `git log -n 4 --oneline` to verify commit history and messages
4. `npm run test:unit`
5. `npm run lint`
6. `npx tsc --noEmit`
7. `gh pr view` to verify the new PR target base, title, and open status
8. `gh pr view 10` to confirm PR #10 is still open

## Exact manual test steps

1. Inspect the new PR URL and confirm its base branch is set to `feat/search-timestamps-and-context-tuning`.
2. Verify the "Files changed" in the PR contains only the 4 review fix areas without unrelated diffs.
3. Confirm PR #10 remains open targeting `main`.
