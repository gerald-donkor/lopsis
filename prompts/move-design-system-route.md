# Serve the Lopsis design system at `/design-system`

## Goal

Make the existing Lopsis design-system showcase available at `/design-system`, rather than at the homepage.

## Skills and guidance read

- Read the installed Next.js 16 App Router guides for layouts and pages, the `page` file convention, and font optimization in `node_modules/next/dist/docs/01-app/`.
- No project skill is required: this is a static, code-native route change with no Sanity, Clerk, search, migration, or generated-image work.

## Code and configuration inspected

- `AGENTS.md`
- `package.json` (Next.js 16.3.3)
- `app/page.tsx`, which currently contains the full design-system showcase
- `app/layout.tsx`, which already supplies Lopsis metadata and self-hosted fonts
- `app/globals.css`
- Existing Git status, which includes user-owned uncommitted design-system work

## Decisions and assumptions

- Preserve the showcase markup, styles, fonts, and global metadata exactly as they are.
- Move the page implementation from `app/page.tsx` to `app/design-system/page.tsx`; under the App Router file-system conventions, that maps it to `/design-system`.
- Leave `app/page.tsx` as a minimal neutral homepage so the root route remains valid and does not duplicate the full design-system board. No redirect is assumed, since the request only specifies the desired route.
- Do not alter unrelated user-owned changes.

## Files expected to change

- `app/page.tsx`
- `app/design-system/page.tsx` (new)
- No CSS, dependency, configuration, environment, or lockfile changes are expected.

## Requirements

- `GET /design-system` renders the existing complete Lopsis design-system page.
- The page retains its current static server-rendered behavior and responsive styling.
- `/` remains a valid route but does not render a second copy of the showcase.
- No user-facing `Vertex` branding is introduced.

## Security considerations

- This is a static UI route only: add no client tokens, external scripts, API calls, or user-provided HTML.
- Keep the current server-component boundary and self-hosted Next.js fonts.

## Acceptance criteria

- Navigating to `/design-system` returns the Lopsis design-system showcase.
- The browser receives no 404 at `/design-system`.
- The root route remains valid and no longer contains the full design-system markup.
- Type checking, linting, and a production build succeed.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Start `npm run dev` and confirm successful HTTP responses from both `/` and `/design-system`.

## Exact manual test steps

1. Run `npm run dev` from `/home/dg/Projects/nextjs/lopsis`.
2. Open `http://localhost:3000/design-system` and verify the complete Lopsis design-system board appears.
3. Open `http://localhost:3000/` and verify it remains a valid, non-duplicated homepage.
4. Resize the design-system page to desktop and mobile widths, confirming its current responsive behavior is unchanged.
