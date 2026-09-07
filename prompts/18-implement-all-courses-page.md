# Implement the Lopsis all courses page

## Goal

Add a simple, production-style `/courses` page that server-renders every published course from the existing private Sanity dataset and links each card to its course detail page.

## Skills and guidance read

- `AGENTS.md`
- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/nextjs.md`
- `sanity-best-practices/references/groq.md`
- Installed Next.js 16.3.3 App Router project-structure and Server Component data-fetching guidance in `node_modules/next/dist/docs/`

## Code and configuration inspected

- `app/page.tsx`
- `app/courses/[slug]/page.tsx`
- `components/home-page.tsx`
- `components/course-page.tsx`
- `components/site-header.tsx`
- `app/globals.css`
- `sanity/data/courses.ts`
- `sanity/queries/courses.ts`
- `sanity/queries/fragments.ts`
- Generated `sanity.types.ts`
- Current worktree state, including uncommitted homepage and course-detail work

## Decisions and assumptions

1. Add `/courses` as a public Server Component route; browsing the catalog does not require authentication.
2. Reuse the existing server-only `getCourses()` helper and its deterministic order: popular courses first, then title ascending.
3. Show all returned courses in one responsive grid. Do not add filtering, sorting, search, pagination, or new dependencies.
4. Use each course's Sanity cover image as the card visual, with the authored alt text and a title-derived fallback if the asset is missing.
5. Keep the page visually consistent with the existing Lopsis header, warm background, typography, borders, and course-detail styling without inventing a new design system.
6. Show only useful catalog information: title, summary, category, instructor, level, total duration, and module count.
7. Make the whole visual hierarchy clearly lead to the existing `/courses/[slug]` detail route.
8. Render a compact empty state when no published courses exist.
9. Keep all content server-rendered; no Client Component or browser-side Sanity request is needed.

## Files expected to change

- `app/courses/page.tsx` — new server-rendered catalog route and static metadata
- `components/all-courses-page.tsx` — new presentational catalog component
- `app/globals.css` — scoped catalog layout, card, empty-state, and responsive styles

No Sanity schema, GROQ query, generated type, seed, environment, authentication, package, or lockfile changes are expected.

## Requirements

### Data flow

- Await `getCourses()` directly in `app/courses/page.tsx`.
- Pass the typed result into the presentational component.
- Keep the private read token, Sanity client, and fetch helper out of browser bundles.
- Render all courses returned by the existing query without hardcoded titles or slugs.

### Page content

- Reuse `SiteHeader`.
- Add a concise “All Courses” heading and supporting sentence.
- Show the real number of available courses with correct singular/plural copy.
- Render a responsive grid of semantic course-card articles.
- Use Sanity `_id` as the React key.
- Link each course title/card action to `/courses/[slug]`.
- Render authored title and summary as text.
- Render category and instructor only from returned Sanity data.
- Format `all-levels` as “All levels” and capitalize the other authored levels.
- Format total duration from `durationSeconds` into hours and minutes.
- Render module count with correct singular/plural copy.
- Use the Sanity cover image through the existing image URL helper and `next/image`.
- Handle missing optional image assets and incomplete optional values safely.

### Scope and interaction

- Do not add catalog filters, sorting, pagination, enrollment, bookmarks, progress, or search behavior.
- Do not create a new API route or fetch data in an effect.
- Do not modify the dynamic course-detail route.

### Accessibility and responsive behavior

- Use one page-level `h1`, semantic articles, descriptive links, and meaningful image alt text.
- Preserve visible keyboard focus through the existing global focus treatment.
- Use three columns on wide screens, two at tablet widths, and one on mobile.
- Avoid horizontal overflow and keep summaries readable at narrow widths.

## Security considerations

- Read the private dataset only through the existing server-only helper.
- Never expose `SANITY_API_READ_TOKEN`, raw environment values, or the Sanity client to a Client Component.
- Treat all Sanity strings as text and use returned slugs only to construct internal framework links.
- Do not add content or progress writes.

## Acceptance criteria

- `/courses` renders successfully and displays every published course returned by Sanity.
- Course cards show real Sanity content and link to their matching detail routes.
- Popular courses appear first according to the existing query order.
- Course covers, metadata, duration totals, and module counts render correctly.
- The page has safe image and empty-dataset fallbacks.
- The layout is three columns on desktop, two on tablet, and one on mobile without overflow.
- The private Sanity token is absent from client output.
- The homepage, course detail page, and design-system page continue to build.

## Checks to run

1. Run `npx tsc --noEmit` from the repository root.
2. Run `npm run lint` from the repository root.
3. Run `npm run build` with access to the private Sanity dataset because a route is added.
4. Start the dev server and verify `/courses`, one returned `/courses/[slug]`, `/`, and `/design-system`.
5. Inspect the catalog HTML to confirm live titles, summaries, metadata, and links are present.
6. Check desktop, tablet, and mobile widths for the expected 3/2/1-column layout and no horizontal overflow.
7. Confirm `SANITY_API_READ_TOKEN` does not appear in client output.

## Exact manual test steps

1. Ensure `.env.local` contains the configured Sanity public values and server-only read token.
2. Run `npm run dev` from the repository root.
3. Open `http://localhost:3000/courses`.
4. Confirm the page heading and real course count appear.
5. Confirm all published Sanity courses render in popular-first, title-ascending order.
6. Confirm every card shows its cover or fallback, title, summary, category, instructor, level, duration, and module count.
7. Open at least two cards and confirm each destination matches the selected course.
8. Resize to wide desktop, tablet, and 375px mobile widths; confirm the grid changes from three to two to one column without horizontal scrolling.
9. Temporarily test an empty query result locally and confirm the empty state renders without placeholder courses.
10. Recheck `/`, `/courses/nextjs-app-router-in-depth`, and `/design-system` for regressions.
