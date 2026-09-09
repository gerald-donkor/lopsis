# Implement Instructor Detail Pages and Profile UI

## Goal

Implement Task 5 from the Lopsis build plan: add the public `/instructors/[slug]` route and a responsive instructor profile page that presents the instructor's Sanity-authored profile and their published courses.

The implementation must:

1. Add a dynamic App Router page with instructor-specific metadata and a proper 404 for unknown slugs.
2. Render a profile header with the instructor photo, Playfair Display name, expertise badges, Portable Text biography, and total published course count.
3. Render a "Courses by [Instructor Name]" section using the same course-card component and learner-progress affordances as the catalog.
4. Include breadcrumbs and a clear path back to the course catalog.
5. Match the established Lopsis visual language and remain usable from desktop through mobile without inventing functionality outside the task.

---

## Skills and project guidance read

- `AGENTS.md`:
  - Section 1: use **Lopsis** everywhere and stay within the learning-platform scope.
  - Section 3: reuse existing components and CSS patterns; no standalone instructor reference image exists, so derive this page from the existing Lopsis design system rather than introducing a new visual direction.
  - Sections 5 and 12: content pages are read-only, the private Sanity dataset is read only through server-side helpers, and no token may reach the browser.
  - Section 8: instructors have a name, slug, photo, expertise, and Portable Text bio; every instructor gets a page and is surfaced with their courses.
  - Section 13: run the type check, lint, production build for route work, and a development-server smoke test.
  - Section 15, Task 5: add `/instructors/[slug]`, dynamic metadata, profile UI, course count, course grid, breadcrumbs, and catalog navigation.
- `sanity-best-practices`:
  - Keep GROQ in `defineQuery`, project only required fields, use direct reference IDs in filters, and resolve reverse references in the query.
  - Continue using the standalone Studio/server-only web data boundary already established by the repository.
- `portable-text-serialization` and its React rules:
  - Render the bio with `@portabletext/react`.
  - Define the typed `PortableTextComponents` mapping outside the component so its identity is stable.
  - Map supported blocks, lists, and links explicitly; external HTTPS links must use safe `rel` behavior.
- Current Next.js 16.3.3 local docs:
  - Dynamic App Router `params` are promises and must be awaited.
  - `generateMetadata` is a Server Component API and may fetch content for the dynamic title and description.
  - Dynamic Sanity images rendered through `next/image` need stable dimensions or `fill`, descriptive alt text, and a narrowly allowed remote host (already configured for `cdn.sanity.io`).

---

## Code and configuration inspected

- `app/courses/[slug]/page.tsx` and `app/lessons/[slug]/page.tsx`:
  - Existing async dynamic-route, `generateMetadata`, `notFound()`, and `Promise<{slug: string}>` conventions.
- `app/courses/page.tsx`:
  - Existing static metadata and server-side Sanity fetch pattern.
- `sanity/queries/instructors.ts`:
  - `INSTRUCTOR_BY_SLUG_QUERY` already returns `_id`, `name`, flattened `slug`, `expertise`, `bio`, `photo`, and reverse-referenced published courses ordered by `popular desc, title asc` using `COURSE_CARD_FRAGMENT`.
- `sanity/data/instructors.ts`:
  - `getInstructorBySlug(slug)` already validates the slug, uses the shared server-only fetch helper, and applies instructor/course/category cache tags.
- `sanity/queries/fragments.ts` and `sanity.types.ts`:
  - Instructor courses already have the complete `COURSE_CARD_FRAGMENT` shape, and `INSTRUCTOR_BY_SLUG_QUERY_RESULT` is generated and ready to consume.
- `studio/schema-types/documents/instructor.ts` and the `portableText` object schema:
  - Photo, at least one expertise item, and biography are required in authored content; biography supports normal text, h2/h3, quotes, bullet/number lists, and HTTPS link annotations.
- `components/all-courses-page.tsx`:
  - The catalog's `CourseCard` is currently file-local and already owns image rendering, metadata formatting, instructor links, PostHog clicks, learner progress, resume, completed, and review states.
- `components/lesson-page.tsx`:
  - Existing stable `PortableTextComponents` rendering pattern and instructor image fallback behavior.
- `sanity/lib/image.ts`, `next.config.ts`, and `app/layout.tsx`:
  - Existing Sanity image builder, allowed `cdn.sanity.io` image host, Playfair/Inter variables, Clerk shell, PostHog identity, and learner-progress provider.
- `app/globals.css`:
  - Existing `.catalog-*`, `.course-*`, header, warm border/background, typography, focus, and responsive conventions to reuse.
- `design/`:
  - There is no instructor-specific reference image. `lopsis-course.png`, `lopsis-home.png`, and the design-system page establish the closest visual vocabulary.

---

## Decisions and assumptions

1. **Route remains a Server Component**
   - `app/instructors/[slug]/page.tsx` fetches through `getInstructorBySlug()` and passes the result to the presentational profile component.
   - Unknown instructor slugs call `notFound()`.
   - The route is public; no Clerk gate is added.

2. **Dynamic metadata uses authored fields only**
   - Title: `${instructor.name} — Instructor — Lopsis`.
   - Description: a concise description derived from the instructor's name and expertise, with a safe generic fallback. Do not place raw Portable Text structures in metadata and do not invent qualifications.
   - Missing content returns `Instructor not found — Lopsis` metadata, consistent with existing dynamic routes.

3. **The catalog card becomes a shared component**
   - Extract the existing file-local catalog `CourseCard` into `components/course-card.tsx` as a Client Component.
   - Preserve its current markup, styling, PostHog behavior, learner-progress calculations, resume links, completed state, and accessible labels.
   - Update `AllCoursesPage` to import this shared component with no observable catalog regression.
   - Use that same shared component for `instructor.courses`; do not duplicate a simpler instructor-only card and do not use the visually different homepage card.

4. **Profile presentation follows existing Lopsis patterns**
   - Use the standard `SiteHeader`, warm patterned shell/canvas, restrained orange accent, Playfair heading, soft borders, and catalog grid proportions.
   - Profile hero is a two-column layout on desktop with a square or portrait image beside profile copy, collapsing cleanly to one column on smaller screens.
   - Use the Sanity image builder with an appropriate crop, `next/image`, LQIP when available, authored alt text, and the instructor's initial as fallback.
   - Expertise values render as a semantic list of badges, not a synthesized sentence.
   - Course count is computed from `instructor.courses.length`, so it reflects the same published, slugged course set actually displayed.

5. **Biography is Portable Text**
   - Render `bio` with `@portabletext/react` and a module-level typed components map.
   - Support the exact styles present in the schema: normal, h2, h3, blockquote, bullets, numbered lists, and HTTPS links.
   - External links open safely with `target="_blank"` and `rel="noreferrer noopener"`.
   - Do not convert the bio to markdown or HTML strings.

6. **Empty courses remain truthful**
   - If an instructor currently has no published courses, show a focused empty state with a link to `/courses` instead of hiding the section or inventing courses.

7. **No query or schema change is expected**
   - The existing query, helper, generated type, schema, and image configuration already provide the required data.
   - Only change them if implementation reveals a concrete type/data omission; if a query changes, regenerate Sanity types before checks.

---

## Expected files to touch

1. `app/instructors/[slug]/page.tsx` (new)
   - Fetch instructor data, generate dynamic metadata, call `notFound()`, and render `InstructorPage`.
2. `components/instructor-page.tsx` (new)
   - Render the header, breadcrumbs, photo/fallback, expertise, biography, course count, course grid, and empty state.
3. `components/course-card.tsx` (new)
   - Hold the existing reusable catalog `CourseCard` Client Component without functional changes.
4. `components/all-courses-page.tsx`
   - Remove the local card implementation and import/use the shared `CourseCard`.
5. `app/globals.css`
   - Add scoped `.instructor-*` styles and responsive behavior while reusing `.catalog-grid` and existing visual tokens where possible.
6. `AGENTS.md`
   - After successful implementation and checks, mark Task 5 `[x]` and point it to `prompts/49-instructor-detail-pages.md`.

Do not touch the Studio schema, GROQ query, generated Sanity types, authentication, progress API, or bookmark storage unless a verified implementation blocker requires it.

---

## Detailed requirements

### 1. Dynamic instructor route

- Create `app/instructors/[slug]/page.tsx` using the repository's async route prop convention:
  - `params: Promise<{ slug: string }>`.
  - Await `params`, then call `getInstructorBySlug(slug)`.
- Export `generateMetadata()` and use only returned Sanity fields for the title/description.
- Call `notFound()` when the helper returns `null`.
- Render `<InstructorPage instructor={instructor} />` for valid data.
- Do not fetch Sanity from a Client Component and do not expose environment variables.

### 2. Shared course card extraction

- Move `CourseCard` and its directly owned helpers/icons out of `components/all-courses-page.tsx` into `components/course-card.tsx`.
- Keep `"use client"` on the card module because it reads learner progress and records PostHog events.
- Accept a typed course prop compatible with both `COURSES_QUERY_RESULT[number]` and `NonNullable<INSTRUCTOR_BY_SLUG_QUERY_RESULT>["courses"][number]`; prefer the existing generated query type rather than a handwritten duplicate.
- Preserve all behavior established by Task 3:
  - Sanity cover image and fallback.
  - Category and linked instructor byline.
  - Level, duration, module count, and lesson count.
  - Signed-in progress bar/count.
  - Resume action and timestamp.
  - Completed/review action.
  - Existing analytics event names and payloads.
- `AllCoursesPage` and the instructor page must render the same shared component.

### 3. Profile header and navigation

- Wrap the page with `SiteHeader` and a page-specific shell/canvas consistent with catalog/course pages.
- Add an accessible breadcrumb nav linking to `/courses`, ending with the instructor's current name as non-linked text.
- Render:
  - Responsive instructor photo with stable aspect ratio and no layout shift.
  - Initial fallback when the image asset is unavailable.
  - Instructor name as the only page-level `h1` using Playfair Display.
  - A semantic list of expertise badges.
  - A correctly pluralized course count (`1 course` / `N courses`).
  - The authored biography as Portable Text.
- Keep all display values grounded in Sanity. Do not generate testimonials, social links, credentials, ratings, or aggregate student totals.

### 4. Biography serialization

- Define `PortableTextComponents` outside `InstructorPage`.
- Map normal paragraphs, h2, h3, blockquotes, unordered lists, ordered lists, and list items.
- Map HTTPS link annotations to safe external anchors.
- Apply typography and spacing through the `.instructor-bio` container and scoped descendants.
- If the bio is unexpectedly absent at runtime, omit the rich-text region gracefully rather than crashing.

### 5. Instructor courses

- Heading: `Courses by ${instructor.name}`.
- Show the exact number of returned courses in nearby supporting text where useful, without duplicating noisy counters.
- Render courses in the existing responsive `.catalog-grid` with the shared `CourseCard`.
- Preserve query ordering: popular courses first, then title ascending.
- For no courses, render an accessible section with a truthful message and `Explore all courses` link to `/courses`.

### 6. Responsive and interaction quality

- Desktop: balanced two-column hero and three-column course grid at existing catalog breakpoints.
- Tablet: reduce hero gap/image size and use the existing two-column course grid behavior.
- Mobile: remove decorative outer gutters, stack profile media and copy, keep the image bounded, wrap expertise badges, and use the one-column card grid.
- Ensure visible keyboard focus for breadcrumbs, biography links, empty-state CTA, and all reused course-card links.
- Respect the repository's `prefers-reduced-motion` rule.
- Avoid horizontal overflow at 320px viewport width.

---

## Security and architectural boundaries

- The page is public and read-only; do not add an auth requirement or mutation route.
- Fetch the private Sanity dataset only through the existing server-only data helper.
- Never pass Sanity API tokens, Clerk secrets, or private PostHog keys to browser code.
- Sanity-authored URLs are constrained to HTTPS by schema; still render external links with `noreferrer noopener`.
- Do not use raw HTML rendering or `dangerouslySetInnerHTML` for the biography.
- Do not add client-side Sanity requests, new dependencies, or new data collection.

---

## Acceptance criteria

1. Visiting a valid `/instructors/[slug]` renders the correct authored photo, name, expertise, Portable Text bio, published course count, and associated course cards.
2. The page has instructor-specific metadata using the Lopsis product name.
3. An unknown slug renders the standard Next.js 404.
4. Breadcrumb/catalog navigation works and the page remains publicly accessible while signed out.
5. Instructor courses use the exact shared catalog `CourseCard`, including signed-in progress/resume/completed states.
6. `/courses` has no visual, functional, analytics, or accessibility regression after the card extraction.
7. Biography headings, paragraphs, quotes, lists, and HTTPS links render correctly and safely.
8. The zero-course state is truthful and links to `/courses`.
9. The page is responsive at desktop, tablet, and 320px mobile widths with no horizontal overflow.
10. No secret or Sanity token is shipped to the browser.
11. Unit tests, type check, lint, production build, and development-server smoke checks report their real results.
12. Task 5 is marked complete in `AGENTS.md` only after all implementation and checks succeed.

---

## Checks to run

Run from the web workspace root:

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm run build
npm run dev
```

For the development-server check, start the server, verify it reaches the ready state, request one known instructor route and one nonexistent instructor route, confirm the expected success/404 behavior, then stop the server. Report actual command results; do not claim unrun checks passed.

If the GROQ query changes despite the current expectation, run the repository's Sanity TypeGen workflow before the TypeScript check and include its result.

---

## Exact manual test steps

1. Start the Lopsis web app with the required Clerk and Sanity environment values.
2. Open `/courses` and click an instructor byline on a course card.
3. Confirm the link opens `/instructors/[slug]` for that instructor.
4. Confirm the header and breadcrumb render and the breadcrumb returns to `/courses`.
5. Confirm the instructor photo uses the authored alt text; if testing content without an asset, confirm the initial fallback is stable.
6. Confirm the instructor name, every expertise badge, biography content, and correctly pluralized course count match Sanity.
7. Confirm biography headings, bullet/numbered lists, blockquotes, and an HTTPS link render correctly; open the link and verify it uses a new tab safely.
8. Confirm "Courses by [Instructor Name]" contains only that instructor's published courses and retains popular/title query order.
9. While signed out, confirm cards show normal course actions and the profile remains accessible.
10. While signed in with existing learner progress, confirm those same cards display progress, Resume, Completed, and Review states exactly as they do on `/courses`.
11. Recheck `/courses` and confirm its cards, byline links, analytics clicks, and responsive layout behave unchanged after extraction.
12. Test an instructor with no published courses and confirm the empty state links to `/courses`.
13. Visit a nonexistent instructor slug and confirm the standard 404 renders.
14. Check the page around 1440px, 900px, 700px, and 320px widths; confirm the hero stacks sensibly, badges wrap, cards reflow, and no horizontal scrollbar appears.
15. Use keyboard-only navigation to verify all links have visible focus and follow a logical order.
16. Inspect the document head and confirm the dynamic title/description contain Lopsis and the current instructor's authored data.
