# Commit and push project changes in structured sessions

## Goal

Stage, commit, and push all existing changes and assets to `origin/main` in separate, logical commit sessions with clean, simple descriptive commit messages.

## Skills read

- None required. This is a Git version control workflow involving repository management, staging, committing, and pushing.

## Code and configuration inspected

- Current Git status via `git status --porcelain` and `git status -u`.
- Remote configuration via `git remote -v` (pointing to `https://github.com/gerald-donkor/lopsis.git`).
- Commit history via `git log -n 5 --oneline` (current HEAD on `main` at `9ab2e23 "first commit"`).
- Production build and TypeScript verification via `npm run build`, `npm run lint`, and `npx tsc --noEmit`.

## Decisions and assumptions

- Group all uncommitted and untracked files into 4 discrete, logical commit sessions matching the history and concerns of the work done:
  1. **Design Reference Assets**: Add the five renamed Lopsis reference mockups in `design/` and the asset rename implementation prompt.
  2. **Agent Guidelines & Skills**: Add `AGENTS.md`, `skills-lock.json`, `.agents/`, `.claude/`, `agent/`, and `tsconfig.json` updates.
  3. **Design System Foundations & Showcase**: Add `app/globals.css`, `app/layout.tsx`, `components/design-system-page.tsx`, and the design system prompt.
  4. **Design System Route & Page Structure**: Add `app/design-system/page.tsx`, `app/page.tsx`, `prompts/move-design-system-route.md`, and `prompts/commit-and-push-sessions.md`.
- Use simple, descriptive, lowercase commit messages following standard conventions.
- After all commits are created, push `main` to `origin`.

## Files to touch in each session

### Session 1: Design reference assets
- `design/lopsis-course.png`
- `design/lopsis-designsystem.png`
- `design/lopsis-home.png`
- `design/lopsis-lesson.png`
- `design/lopsis-search.png`
- `prompts/rename-design-assets.md`
- **Commit message**: `add lopsis design reference assets`

### Session 2: Agent guidelines & skill configurations
- `AGENTS.md`
- `skills-lock.json`
- `.agents/`
- `.claude/`
- `agent/`
- `tsconfig.json`
- **Commit message**: `configure agent instructions and skills`

### Session 3: Design system foundations & showcase component
- `app/globals.css`
- `app/layout.tsx`
- `components/design-system-page.tsx`
- `prompts/implement-lopsis-design-system.md`
- **Commit message**: `implement lopsis design system foundations and showcase`

### Session 4: Route relocation & repository readiness
- `app/design-system/page.tsx`
- `app/page.tsx`
- `prompts/move-design-system-route.md`
- `prompts/commit-and-push-sessions.md`
- **Commit message**: `serve design system at /design-system route`

## Requirements

- All modified and untracked files must be committed without leaving a dirty working tree.
- Each commit must be self-contained and logically scoped.
- The `origin` remote must receive the new commits on branch `main`.

## Security considerations

- Confirm no secret keys, credentials, or `.env` files are included in any staging operation.
- Verify `.gitignore` rules remain respected.

## Acceptance criteria

- `git status` reports a clean working tree.
- `git log` shows the 4 distinct, descriptive commits ahead of `first commit`.
- `git push origin main` executes cleanly and synchronizes with GitHub.
- `npm run build` succeeds.

## Checks to run

- `git status`
- `git log -n 6 --oneline`
- `npm run build`
- `git push origin main`

## Exact manual test steps

1. Run `git status` and verify working tree is clean.
2. Run `git log -n 6 --oneline` and inspect commit messages and history.
3. Check the GitHub repository `https://github.com/gerald-donkor/lopsis` to confirm `main` has the commits.
