# Push the Sanity content work and open a pull request

## Goal

Package the current Lopsis Sanity schema, generated types, queries, seed tooling, seed data, and implementation prompts into a clean new Git branch; validate the work; push it to `origin`; and open a new pull request against `main`.

## Skills and documentation read

- Repository `AGENTS.md` workflow and verification requirements.
- No additional implementation skill is needed because this task packages and verifies existing work rather than changing Sanity behavior.

## Existing code and repository state inspected

- Current branch: `feat/lopsis-homepage`.
- Remote: `origin` at `gerald-donkor/lopsis`.
- Default/base branch: `main`.
- Existing PRs #1, #2, and #3 from `feat/lopsis-homepage` are merged.
- `origin/main` contains those merge commits, while the current branch has two additional commits:
  - `docs: add Studio environment configuration prompt`
  - `chore: refresh generated Sanity types`
- The working tree contains Sanity schema/query/type changes, four prompt files, and seed tooling/data under `studio/scripts/seed/`.
- `.env.local` and `studio/.env.local` are ignored and must not be committed.
- The exposed Sanity token has already been replaced and revoked; no credential value belongs in the PR.

## Decisions and assumptions

1. Create a new branch named `feat/sanity-seed-content` from the current commit so the two unmerged commits remain included.
2. Commit the current working-tree changes on that branch.
3. Merge the latest `origin/main` into the new branch rather than rewriting or dropping existing commits.
4. Preserve all unrelated user changes and include only the currently inventoried Lopsis files.
5. Replace remaining `vertex-` placeholder seed identifiers with `lopsis-` before committing, as required by the product naming rules; this affects future placeholder URL resolution only and does not mutate the live dataset.
6. Do not deploy Studio, schema, or dataset content as part of this Git/PR task.
7. Open the PR against `main` with a concise title and an evidence-based body containing the checks actually run.

## Files expected to touch

- `sanity.types.ts`
- `sanity/queries/courses.ts`
- `studio/schema-types/documents/course.ts`
- `studio/schema-types/documents/instructor.ts`
- `studio/schema-types/documents/lesson.ts`
- `studio/schema-types/index.ts`
- `studio/schema-types/objects/learning-outcome.ts`
- `studio/schema-types/objects/module.ts`
- `studio/schema-types/objects/resource.ts`
- `studio/schema.json`
- `studio/scripts/seed/seed-content.ts`
- `studio/scripts/seed/seed.ndjson`
- `studio/scripts/seed/upload-missing-assets.ts`
- `studio/scripts/seed/videos.json`
- Current untracked prompt files in `prompts/`
- `prompts/open-sanity-content-pr.md`

## Requirements

1. Create and switch to `feat/sanity-seed-content` without discarding working-tree changes.
2. Replace only remaining `vertex-` placeholder identifiers in the seed data with `lopsis-`.
3. Review the complete diff and verify no `.env` file, API token, secret, generated build output, or unrelated file is staged.
4. Run the required checks and report their real results.
5. Commit the intended files with a focused Conventional Commit message.
6. Merge `origin/main` and resolve conflicts without losing either the current work or upstream changes.
7. Re-run relevant checks if the merge changes tested files.
8. Push the new branch to `origin` with upstream tracking.
9. Open one new GitHub pull request targeting `main`.
10. Return the branch name, commit, PR title, and clickable PR URL.

## Security considerations

- Never stage `.env.local`, `studio/.env.local`, tokens, CLI authentication state, or temporary helpers.
- Inspect staged file names and scan staged content for credential-shaped values without printing any discovered secret.
- Keep the Viewer token server-only and the Editor token confined to ignored local Studio configuration.
- Do not include token values in the commit message, PR body, commands, or final report.
- Do not force-push, rewrite existing branches, or delete remote branches.

## Acceptance criteria

- A new `feat/sanity-seed-content` branch exists and tracks its remote counterpart.
- The intended Sanity and prompt changes are committed.
- The branch includes the latest `origin/main` without destructive history rewriting.
- Required checks pass, or any real failures are reported before push/PR creation.
- No local environment file or secret is committed.
- A new open PR targets `main` and accurately summarizes the changes and checks.

## Checks to run

1. `git diff --check` before staging.
2. Studio TypeScript check.
3. Studio production build.
4. Root TypeScript check.
5. Root lint.
6. Root production build because server-side Sanity queries/types changed.
7. Read-only live Sanity query/count verification with the new Viewer token.
8. `git diff --cached --check`, staged file inventory, and a non-printing staged-secret scan.
9. Confirm the final branch is ahead of and mergeable with `origin/main`.

## Exact manual test steps

1. Check out the PR branch locally.
2. Start Studio from `studio/` with `npm run dev` and open the Courses list.
3. Confirm the seeded courses, lessons, instructors, categories, and image previews load.
4. Start the web workspace with `npm run dev`.
5. Open the Lopsis catalog and confirm private Sanity content loads.
6. Review the PR file list and confirm no `.env.local` file appears.
