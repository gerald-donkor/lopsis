# Use webpack for production builds

## Goal

Make the standard Lopsis production build command succeed on restricted execution hosts by opting the production build into Next.js's supported webpack builder while leaving development on the default Turbopack builder.

## Skills and documentation read

- Repository `AGENTS.md` workflow and verification requirements.
- Installed Next.js 16 upgrade guide at `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- Installed Next.js CLI reference at `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`.

## Existing code and repository state inspected

- The root `package.json` currently defines `"build": "next build"`, which uses Turbopack by default in Next.js 16.3.3.
- The default build fails while Turbopack evaluates PostCSS because the execution host rejects localhost port binding with `EPERM`.
- A minimal Node `net.createServer().listen(...)` test fails with the same `EPERM`, confirming this is a host restriction rather than an error in `app/globals.css`.
- `npx next build --webpack` completes successfully, including compilation, TypeScript, page-data collection, and static generation.
- The installed Next.js documentation explicitly supports `next build --webpack` and shows keeping `next dev` on Turbopack while using webpack for production builds.
- The current branch is `feat/sanity-seed-content`, which tracks the open PR branch.
- `sanity.types.ts` already has an unrelated unstaged trailing blank-line change. Preserve it and do not stage it as part of this task.

## Decisions and assumptions

1. Change only the root `build` script from `next build` to `next build --webpack`.
2. Keep `dev` as `next dev` so local development continues to use the Next.js 16 default Turbopack builder.
3. Do not change CSS, PostCSS, Next configuration, dependencies, or application code because the confirmed failure is caused by the host policy.
4. Commit and push the focused change to the current `feat/sanity-seed-content` branch so the open pull request is updated.
5. Preserve and exclude the pre-existing unstaged `sanity.types.ts` change.

## Files expected to touch

- `package.json`
- `prompts/use-webpack-for-production-build.md`

## Requirements

1. Set the root package script to `"build": "next build --webpack"`.
2. Leave all other package scripts and dependencies unchanged.
3. Run the standard `npm run build` command and confirm it now selects webpack and completes successfully.
4. Run the root TypeScript check and lint.
5. Review the staged diff and confirm only `package.json` and this prompt are staged.
6. Commit with a focused Conventional Commit message and push the current branch to update PR #4.
7. Do not stage, edit, discard, or otherwise alter the existing `sanity.types.ts` worktree change.

## Security considerations

- Do not stage environment files, secrets, tokens, build output, or unrelated worktree changes.
- The script change must not expose or alter environment-variable handling.
- Use the explicit staged-file allowlist before committing.

## Acceptance criteria

- `npm run build` invokes `next build --webpack` and succeeds.
- Root TypeScript and lint checks pass.
- Development remains configured as `next dev`.
- Only the approved package script and prompt file are committed.
- The commit is pushed to `feat/sanity-seed-content`, updating PR #4.
- The existing unstaged `sanity.types.ts` change remains untouched and unstaged.

## Checks to run

1. `git diff --check -- package.json prompts/use-webpack-for-production-build.md`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. `git diff --cached --check`
6. Staged file inventory and non-printing staged-secret scan.
7. Final branch and PR verification after push.

## Exact manual test steps

1. Check out `feat/sanity-seed-content`.
2. Run `npm run build` from the repository root.
3. Confirm the output identifies `Next.js 16.3.3 (webpack)`.
4. Confirm compilation, TypeScript, page-data collection, and static page generation finish successfully.
5. Run `npm run dev` and confirm Next.js still starts with Turbopack for local development.
