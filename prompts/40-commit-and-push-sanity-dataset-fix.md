# Commit and push Sanity dataset deployment fix

## Goal

Commit and push the Sanity dataset fallback changes and implementation documentation to `origin/main` so that Vercel builds successfully without missing dataset errors.

## Skills and guidance read

- `AGENTS.md` (Sections 2, 5, 12, 13)

## Code and repository state inspected

- Current branch: `fix/review-player-and-search-tests` (already merged into `main` in PR #11).
- `origin/main` commit: `7b72c1b` (merge commit of PR #10 and PR #11).
- Uncommitted changes in working tree:
  - `sanity/env.ts`
  - `studio/sanity.cli.ts`
  - `studio/sanity.config.ts`
  - `prompts/39-fix-vercel-deployment-sanity-dataset-error.md`
- Branch protection check: `main` has no branch protection rules.
- Local verification completed: TypeScript compiler check (`npx tsc --noEmit`), ESLint (`npm run lint`), unit tests (`npm run test:unit`), Studio typecheck (`npm --prefix studio run typecheck`), and production build (`npm run build`).

## Decisions and assumptions

- Move working tree changes onto `main` (updated to `origin/main` at `7b72c1b`).
- Stage and commit all 5 files in two logical, conventional commits:
  1. `fix(sanity): default dataset to production for deployment resilience` (`sanity/env.ts`, `studio/sanity.cli.ts`, `studio/sanity.config.ts`)
  2. `docs: document Vercel deployment fix implementation and push prompt` (`prompts/39-fix-vercel-deployment-sanity-dataset-error.md`, `prompts/40-commit-and-push-sanity-dataset-fix.md`)
- Push `main` directly to `origin/main`, which triggers the Vercel deployment on GitHub update.
- Ensure `.env.local` and any secret tokens remain untracked and uncommitted.

## Expected files to commit

- `sanity/env.ts`
- `studio/sanity.cli.ts`
- `studio/sanity.config.ts`
- `prompts/39-fix-vercel-deployment-sanity-dataset-error.md`
- `prompts/40-commit-and-push-sanity-dataset-fix.md`

## Requirements

- Working tree must be completely clean after commits.
- No private tokens or environment values committed.
- Remote `origin/main` successfully updated with the commits.

## Security considerations

- Confirm `git diff --cached` contains only the intended code and markdown documentation.
- Verify `.env.local` remains untracked and excluded by `.gitignore`.

## Acceptance criteria

- `git status` reports working tree clean.
- `git log` reflects the two conventional commits ahead of `7b72c1b`.
- `git push origin main` succeeds.

## Checks to run

1. `git status`
2. `git diff --staged` review
3. `git log -n 3 --oneline`
4. `git push origin main`

## Exact manual test steps

1. Run `git status` to verify working tree is clean.
2. Visit `https://github.com/gerald-donkor/lopsis/commits/main` to verify commits appear on GitHub.
3. Check Vercel deployment dashboard to monitor the new build triggered by the push to `main`.
