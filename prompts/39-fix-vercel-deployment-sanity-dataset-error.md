# Fix Vercel deployment build error: Missing environment variable NEXT_PUBLIC_SANITY_DATASET

## Goal

Fix the Vercel deployment build failure where `next build --webpack` fails during configuration and page data collection with `Error: Missing environment variable: NEXT_PUBLIC_SANITY_DATASET`, and document the environment variables required on Vercel for deployment success.

## Skills and guidance read

- `AGENTS.md` (Sections 5, 6, 12, 13)
- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/nextjs.md`

## Code and configuration inspected

- **Vercel Build Log**: Failed at `Collecting page data using 1 worker ...` -> `Failed to collect configuration for /api/search` -> `[cause]: Error: Missing environment variable: NEXT_PUBLIC_SANITY_DATASET` at `.next/server/app/api/search/route.js`.
- `sanity/env.ts`: Exports `dataset = assertValue(process.env.NEXT_PUBLIC_SANITY_DATASET, 'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET')`. Throws at module evaluation time when Next.js collects route configurations.
- `.env.example`: Documents `NEXT_PUBLIC_SANITY_DATASET=production`, `NEXT_PUBLIC_SANITY_API_VERSION=2026-09-02`, and `SANITY_STUDIO_DATASET=production`.
- `sanity/env.ts` already provides a fallback for `apiVersion`: `process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-09-02'`, but lacks a fallback for `dataset`.
- `studio/sanity.config.ts` and `studio/sanity.cli.ts`: Also inspect `SANITY_STUDIO_DATASET`.
- Static routes (`/` and `/courses`) require Sanity project ID and read token to prerender content at build time.

## Decisions and assumptions

- Provide a safe default `'production'` for `dataset` in `sanity/env.ts`: `process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'`, aligning with `.env.example`.
- Keep `projectId` strictly asserted: every Sanity project has a unique ID, whereas the default dataset in Sanity is standardly `production`.
- In `studio/sanity.config.ts` and `studio/sanity.cli.ts`, also provide `'production'` fallback for `SANITY_STUDIO_DATASET` for consistency.
- Document and instruct the user to configure all required environment variables in the Vercel dashboard (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, etc.), since static generation of pages and dynamic services on Vercel require them.

## Expected files

- `sanity/env.ts`
- `studio/sanity.config.ts`
- `studio/sanity.cli.ts`

## Requirements

- `sanity/env.ts` must resolve `dataset` to `process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'`.
- Top-level evaluation of `/api/search` must not throw a missing dataset error when `NEXT_PUBLIC_SANITY_DATASET` is unset.
- Keep `NEXT_PUBLIC_SANITY_PROJECT_ID` asserting when missing to fail fast with a clear error if unconfigured.
- Maintain TypeScript types and all existing exports.

## Security considerations

- `dataset` is non-sensitive public metadata identifying the Sanity dataset name (`production`).
- Server secrets (`SANITY_API_READ_TOKEN`, `CLERK_SECRET_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) remain strictly server-side and are not bundled or exposed to the browser.
- `.env.local` remains untracked and in `.gitignore`.

## Acceptance criteria

- `sanity/env.ts` falls back to `'production'` if `NEXT_PUBLIC_SANITY_DATASET` is absent.
- `npx tsc --noEmit` passes with 0 errors.
- `npm run lint` passes with 0 errors.
- `npm run test:unit` passes with 0 failures.
- `npm run build` succeeds locally.

## Checks to run

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run test:unit`
4. `npm run build`

## Manual test steps

1. Run `NEXT_PUBLIC_SANITY_DATASET="" npm run build` to verify that an empty or missing `NEXT_PUBLIC_SANITY_DATASET` falls back to `'production'` without crashing route collection.
2. In the Vercel Project Dashboard (Settings > Environment Variables), ensure all required production environment variables from `.env.example` / `.env.local` are set.
3. Redeploy on Vercel and verify the build passes.
