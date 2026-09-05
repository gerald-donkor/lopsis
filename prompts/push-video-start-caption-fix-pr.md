# Push video start and caption fallback fix PR

## Goal

Package the approved Lopsis video start-clamping and caption-fallback fixes into a focused commit, push them on a new branch, and open a stacked GitHub pull request without duplicating the still-unmerged lesson and search work.

## Skills and documentation read

- Repository `AGENTS.md` workflow, architecture, validation, and handoff requirements.
- The approved implementation prompt at `prompts/fix-video-start-and-caption-fallback.md`.
- CodeRabbit CLI documentation previously reviewed for the optional local-review workflow.

## Existing code and repository state inspected

- Current branch: `feat/lessons-and-intelligent-search`, tracking `origin/feat/lessons-and-intelligent-search` at commit `34790f8`.
- GitHub PR #6 is open and clean, with head `feat/lessons-and-intelligent-search` and base `main`: `https://github.com/gerald-donkor/lopsis/pull/6`.
- The current worktree contains only the two approved source edits plus their implementation prompt before this release prompt is added:
  - `app/lessons/[slug]/page.tsx`
  - `studio/scripts/ingest-videos.ts`
  - `prompts/fix-video-start-and-caption-fallback.md`
- Root TypeScript, ESLint, Studio TypeScript, `git diff --check`, and the network-enabled production build have passed for the implementation.
- The optional CodeRabbit review was skipped because neither `coderabbit` nor `cr` is installed as a directly usable CLI on `PATH`.
- Dev startup reached Next.js readiness but exited because `.next/dev/lock` is stale and references dead PID `938955`; do not alter or commit that generated state.

## Decisions and assumptions

1. Fetch the latest remote refs and confirm PR #6 remains open before creating the branch.
2. Create `fix/video-start-caption-fallback` from the current `feat/lessons-and-intelligent-search` head so the new work remains dependent on PR #6.
3. Open the new PR with base `feat/lessons-and-intelligent-search`, not `main`. This limits its visible diff to the focused fix while PR #6 is unmerged.
4. Commit exactly the two source files and two prompt files with a focused Conventional Commit message: `fix(video): handle start bounds and caption fallback`.
5. Do not amend, rebase, force-push, merge, or modify PR #6.
6. Do not include generated `.next` state or unrelated files.
7. Use the installed GitHub CLI binary directly because the user-level `gh` wrapper attempts to mutate read-only `mise` configuration in this environment.

## Files expected to include in the commit

- `app/lessons/[slug]/page.tsx`
- `studio/scripts/ingest-videos.ts`
- `prompts/fix-video-start-and-caption-fallback.md`
- `prompts/push-video-start-caption-fix-pr.md`

## Requirements

1. Confirm the remote base branch has not moved unexpectedly and PR #6 remains open.
2. Create and switch to `fix/video-start-caption-fallback` from the current PR #6 head.
3. Stage only the four allowlisted files.
4. Review the staged diff and run staged whitespace and secret-name checks.
5. Commit with `fix(video): handle start bounds and caption fallback`.
6. Push the new branch to `origin` with upstream tracking; never force-push.
7. Open a non-draft PR targeting `feat/lessons-and-intelligent-search` with a concise description of both fixes and the completed checks.
8. State clearly in the PR body that it is stacked on PR #6 and should be reviewed/merged after #6, or retargeted to `main` after #6 merges.
9. Verify the PR base, head, URL, state, and changed-file list after creation.

## Security considerations

- Stage through an explicit file allowlist; do not use broad staging commands.
- Do not print or commit `.env*`, API keys, tokens, credentials, build output, or local CLI state.
- Review staged filenames and scan the staged patch for common secret-bearing names before committing.
- Do not pass authentication tokens on the command line or include them in the PR body.
- Do not enable CodeRabbit usage credits or any billable action.

## Acceptance criteria

- A new remote branch named `fix/video-start-caption-fallback` exists and tracks its origin counterpart.
- One focused commit contains only the four allowlisted files.
- The new GitHub PR is open with base `feat/lessons-and-intelligent-search` and head `fix/video-start-caption-fallback`.
- The PR diff contains only the duration-boundary fix, caption-fallback fix, and their prompt documentation.
- PR #6 remains open and unchanged.
- The final report includes the branch, commit, PR number, title, base/head relationship, and clickable URL.

## Checks to run

1. `git fetch origin` and verify local/current ancestry against `origin/feat/lessons-and-intelligent-search`.
2. Re-query PR #6 and confirm it remains open with the expected head and base.
3. `git diff --check` before staging.
4. Stage only the four allowlisted files.
5. Inspect `git diff --cached --stat`, `git diff --cached --check`, and the complete staged patch.
6. Scan the staged patch for common secret-bearing variable names without printing environment values.
7. After commit, verify `git show --stat --oneline HEAD` and `git diff origin/feat/lessons-and-intelligent-search...HEAD`.
8. Push with upstream tracking.
9. Create the stacked PR and verify its metadata and changed files through GitHub.

## Exact manual test steps

1. Open the new PR URL.
2. Confirm its base is `feat/lessons-and-intelligent-search` and its head is `fix/video-start-caption-fallback`.
3. Confirm GitHub shows only the two source changes and two prompt files.
4. Confirm the PR body identifies PR #6 as the unmerged dependency.
5. Confirm PR #6 still targets `main` and remains unchanged.
