# Fix Sanity Studio environment configuration

## Goal

Make the standalone Lopsis Sanity Studio start at port 3333 without the missing `SANITY_STUDIO_PROJECT_ID` error, while keeping credentials and project configuration correctly scoped.

## Skills and guidance read

- `AGENTS.md`
- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/project-structure.md`

## Code and configuration inspected

- `studio/sanity.config.ts` requires `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`.
- `studio/sanity.cli.ts` uses the same Studio-specific variables.
- Root `.env.local` supplies the Sanity project and dataset under the web-facing `NEXT_PUBLIC_SANITY_*` names.
- `.env.example` already documents the two required Studio variables and says to copy them to `studio/.env.local`.
- The repo’s `.gitignore` ignores environment files, including `studio/.env.local`.

## Decisions and assumptions

- Keep the Studio standalone; do not embed it in Next.js or weaken the required-variable checks.
- Create the untracked `studio/.env.local` with the project ID and dataset already configured for this local checkout.
- Project ID and dataset are non-secret Studio configuration. Do not copy any Clerk key, Sanity read token, or other secret into the Studio environment file.
- Keep `.env.example` as the committed source of required environment variable names; it already has the required entries, so no documentation changes are expected.

## Expected files

- `studio/.env.local` (new, ignored local configuration)

## Requirements

- Define non-empty `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` for the Studio process.
- Preserve the existing `Lopsis Studio` title, schema, structure, and Vision configuration.
- Do not expose or commit credentials.

## Security considerations

- The Studio receives only its project ID and dataset.
- Sanity read/write tokens and Clerk secret keys remain absent from the Studio’s browser-delivered configuration.
- The new environment file stays ignored by Git.

## Acceptance criteria

- Starting Studio from `studio/` no longer throws the missing-variable error.
- `npm run typecheck` in `studio/` succeeds.
- The browser can load the Studio at `http://localhost:3333`.

## Checks to run

1. `npm run typecheck` from `studio/`.
2. Start `npm run dev` from `studio/` and confirm the startup output does not report missing Studio environment variables.

## Manual test steps

1. Run `cd studio && npm run dev`.
2. Open `http://localhost:3333`.
3. Confirm that the Lopsis Studio loads and the desk structure is visible.
