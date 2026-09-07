# Implement the Sanity-backed Lopsis course page

## Goal

Implement a responsive dynamic course detail page at `/courses/[slug]` using the desktop reference in `design/lopsis-course.png` as the visual source of truth and the existing private Sanity dataset as the content source.

The page must reproduce the reference's header, breadcrumb, course hero, learning outcomes, expandable course-content list, and fixed progress action strip while using **Lopsis** branding and rendering real seeded course data. The primary manual-test fixture is `/courses/nextjs-app-router-in-depth`, backed by the existing seeded “Next.js App Router in Depth” document.

Do not add learner-progress persistence, bookmarking persistence, a catalog page, a lesson page, analytics, search, or new Sanity content in this task.

## Skills and guidance read

- `AGENTS.md`
- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/nextjs.md`
- `sanity-best-practices/references/groq.md`
- Installed Next.js 16.3.3 App Router guidance under `node_modules/next/dist/docs/` for dynamic routes, async `params`, Server Components, server-side data fetching, links, and images.

## Code, configuration, and content inspected

- `design/lopsis-course.png` at its original 1024 × 1536 size.
- `package.json`, `tsconfig.json`, `next.config.ts`, and `.env.example`.
- `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`.
- `components/home-page.tsx` and `components/auth-controls.tsx` for the existing Lopsis header, navigation, Clerk controls, icons, typography, framing, and responsive conventions.
- `studio/schema-types/documents/course.ts` and `lesson.ts`.
- `studio/schema-types/objects/module.ts` and `learning-outcome.ts`.
- `sanity/queries/courses.ts` and `sanity/queries/fragments.ts`.
- `sanity/data/courses.ts`, `sanity/lib/fetch.ts`, and `sanity/lib/image.ts`.
- `studio/scripts/seed/seed.ndjson` and `studio/scripts/seed/seed-content.ts`.
- Generated `sanity.types.ts`; it currently has an unrelated uncommitted modification that must be preserved.

## Decisions and assumptions

1. The reference controls layout, spacing, typography, palette, borders, shadows, decorative framing, icon placement, and responsive behavior. Sanity controls all course-specific content.
2. Use **Lopsis** everywhere in the implementation. Do not reproduce the reference's “Vertex” wordmark.
3. Build a dynamic App Router route at `app/courses/[slug]/page.tsx`. Await `params`, fetch on the server through `getCourseBySlug`, and call `notFound()` when no published course matches.
4. Add dynamic course metadata from Sanity with clean fallback text and no private values.
5. Reuse the existing private, server-only Sanity client and typed query/data layer. Keep the read token off the browser.
6. The existing course query already projects the data required by the page. Change it only if implementation proves a required display field is missing; if it changes, regenerate TypeGen output rather than hand-editing generated types.
7. Derive total course duration from referenced lesson `durationSeconds`, derive module/lesson counts from the returned arrays, and format level/student counts for display. Never hardcode the reference's `18h 24m`, `12 modules`, or `2.1k students` when Sanity returns different values.
8. The seed contains 4 modules with 3 lessons each for the primary fixture. Initially show the first 3 module rows and provide a “Show all 4 modules” control. The interaction adapts to any course length and disappears when expansion is unnecessary.
9. Each module row shows its derived order, title, summary, aggregate duration, and an accessible disclosure control. Expanding a module reveals its ordered lesson links and derived lesson labels; this is the only client-side state needed for curriculum interaction.
10. Course cover images come from Sanity and use the existing image helper with sensible dimensions, crop, alt text, and blur placeholder when available. Do not fabricate a screenshot-specific “N” cover when the seeded image differs.
11. Map the existing learning-outcome icon tokens (`layers`, `workflow`, `gauge`, `rocket`, `shield`, `puzzle`, `code`, `sparkles`, and reasonable fallback) to lightweight inline SVG icons. Outcome titles and descriptions remain Sanity-authored.
12. Extract or introduce a small reusable site-header component only if it can preserve the current homepage appearance exactly. It should use the existing `AuthControls`, Lopsis mark, nav links, and notification bell; avoid duplicating a second divergent header implementation.
13. “Continue Learning” links to the first lesson in curriculum order. The bookmark control is a non-persistent presentational control in this task and must not imply saved server state.
14. Learner-progress persistence does not yet exist in this repository and is a separate product feature. Keep the reference's fixed bottom strip and progress styling, but render a truthful zero state (“0% complete” and an empty track) rather than hardcoding 35%. Do not add a progress schema, write token, API route, or client-side fake persistence.
15. Preserve all unrelated worktree changes, especially the pre-existing modification to `sanity.types.ts`.

## Files expected to create or change

- `app/courses/[slug]/page.tsx`
- `components/course-page.tsx`
- `components/course-curriculum.tsx` for the narrowly scoped interactive disclosure/show-all behavior
- `components/site-header.tsx` if extracting the current shared header is safe
- `components/home-page.tsx` only if needed to consume the extracted header without visual regression
- `app/globals.css` for course-page fidelity and responsive rules
- `next.config.ts` only if the Sanity image CDN requires a remote image pattern
- `sanity/queries/courses.ts` only if a required field is genuinely absent
- `sanity.types.ts` only via `npm run typegen` if a query changes, while preserving the user's existing modification

No Studio schema, seed, package, lockfile, environment, middleware, progress, or write-route changes are expected.

## Requirements

### 1. Dynamic server-rendered route

- Render `/courses/[slug]` from `getCourseBySlug(slug)` in a Server Component.
- Await the Next.js 16 `params` promise.
- Return the framework 404 for missing/invalid course slugs.
- Generate title and description metadata from the course without exposing Stega/private values.
- Keep Sanity imports and token-backed data access out of Client Components.

### 2. Header and page frame

- Match the reference's warm centered canvas, diagonal outer hatching, subtle vertical border, and header divider.
- Header: Lopsis mark and name, Courses/My Learning navigation, notifications button, and current Clerk auth controls/avatar.
- Preserve keyboard focus states and semantic navigation labels.
- Ensure no visible “Vertex” text appears.

### 3. Course hero

- Breadcrumb: All Courses, chevron, current course title.
- Sanity cover image at the reference's square/near-square dimensions and rounded corners.
- Conditionally render the Popular badge.
- Render title and summary from Sanity.
- Render level, total derived duration, module count, and formatted student count with matching icons.
- Primary action opens the first lesson; secondary bookmark treatment matches the reference but does not persist state.
- Handle incomplete optional fields without broken layout or fake copy.

### 4. Learning outcomes

- Render the “What you’ll learn” bordered panel from `learningOutcomes` in authored order.
- Use a two-column desktop grid matching the reference and a single-column mobile layout.
- Map each icon token to a visually consistent orange outline icon with an accessible text fallback where necessary.
- Render no empty panel if the array is absent.

### 5. Course content

- Render a heading with real module count and derived total duration.
- Initially reveal a reference-proportional subset (3 of the seeded fixture's 4 modules), then allow all modules to be shown/hidden.
- Each module row contains derived order, title, summary, aggregate lesson duration, and an accessible expanded/collapsed state.
- Expanded content lists real lessons in order with derived `Lesson M.N` labels and links to `/lessons/[slug]`.
- Null/dangling lesson references are ignored safely and do not crash duration/count calculations.

### 6. Bottom progress action strip

- Reproduce the fixed/sticky bottom action strip, progress label, track, and CTA appearance from the reference.
- Until real progress records are implemented, show `0% complete`, an empty progress track, and route the CTA to the first lesson.
- Keep the strip usable on narrow screens without covering essential content; include sufficient page-bottom spacing.

### 7. Responsive fidelity and accessibility

- At the 1024px reference viewport, closely match the provided geometry and hierarchy.
- At tablet/mobile widths, stack the hero, collapse outcomes to one column, keep module rows readable, and reflow the bottom strip without horizontal overflow.
- Use semantic `header`, `main`, `nav`, `section`, headings, links, and buttons.
- Use real buttons for disclosure/show-all controls with `aria-expanded`/`aria-controls`.
- Provide alt text for Sanity images, labels for icon-only controls, visible focus rings, and reduced-motion-safe transitions.

## Security considerations

- Keep `SANITY_API_READ_TOKEN` server-only and continue fetching through the existing `server-only` data layer.
- Do not serialize the token, raw Sanity client, unprojected documents, or private environment variables to the client.
- Validate the slug through the existing `requireSlug` helper and pass it as a GROQ parameter.
- Do not add client-side Sanity reads, browser tokens, write tokens, progress writes, or bookmark persistence.
- Treat authored URLs/slugs only as data for framework links and existing image tooling; do not inject authored HTML.

## Acceptance criteria

- `/courses/nextjs-app-router-in-depth` renders published seeded Sanity content and closely matches `design/lopsis-course.png` in desktop layout and styling.
- A second valid seeded course slug renders the same template with its own real content, proving the page is dynamic.
- A nonexistent course slug returns the Next.js 404.
- All course-specific text, counts, images, outcomes, module titles, summaries, lesson titles, and durations come from Sanity or are derived from returned Sanity data.
- The course page shows Lopsis branding and no visible Vertex branding.
- Course duration equals the sum of returned lesson durations; module durations equal their lesson sums.
- Show-all and module disclosure controls work with keyboard and pointer input and expose correct ARIA state.
- First-lesson CTAs and expanded lesson links use real seeded slugs.
- The fixed progress strip truthfully shows the zero state and does not claim persisted learner progress.
- The homepage and `/design-system` retain their current appearance/functionality.
- No horizontal overflow occurs at 1024px, 768px, or 375px widths.
- Type check, lint, production build, and development-route checks pass with real reported output.

## Checks to run

From the repository root:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. Start `npm run dev` and verify HTTP responses for:
   - `/courses/nextjs-app-router-in-depth` → 200
   - another seeded course route → 200
   - `/courses/does-not-exist` → 404
   - `/` → 200
   - `/design-system` → 200
5. Query/inspect the rendered fixture to confirm seeded title, summary, outcomes, modules, lessons, and derived durations are present.
6. Search implementation files for visible `Vertex` text; the source PNG is excluded.
7. If a GROQ query changes, run `npm run typegen` from `studio/` before the web checks and confirm the existing user change in `sanity.types.ts` is not overwritten unintentionally.

Studio deploy, schema deploy, and seed import are not required because this implementation consumes the already deployed schema and seeded documents without changing them.

## Exact manual test steps

1. Ensure the root `.env.local` contains the configured public Sanity project/dataset values and server-only read token, plus Clerk keys.
2. Run `npm run dev` from the repository root.
3. Open `http://localhost:3000/courses/nextjs-app-router-in-depth` at 1024 × 1536.
4. Compare it with `design/lopsis-course.png`:
   - Confirm the warm framed canvas, header, breadcrumb, two-column hero, Popular badge, serif title, metadata row, two buttons, learning-outcome grid, curriculum panel, and bottom action strip.
   - Confirm the brand reads Lopsis.
   - Confirm the course values match Sanity rather than the screenshot's static example values.
5. Click “Show all 4 modules” and confirm the final module appears; click again and confirm the compact state returns.
6. Expand every module and confirm its three seeded lessons appear in authored order with correct `Lesson M.N` labels and links.
7. Activate the primary CTA and confirm it targets the first seeded lesson URL.
8. Navigate to a second seeded course slug and confirm title, image, summary, outcomes, counts, modules, lessons, and durations change.
9. Open a nonexistent slug and confirm the 404 page appears.
10. Resize to 768px and 375px; confirm stacked layout, readable controls, reflowed progress strip, and no horizontal scrolling.
11. Navigate using only Tab/Shift+Tab/Enter/Space and confirm visible focus, working disclosure controls, and correct focus order.
12. Recheck `/` and `/design-system` for visual regressions.
