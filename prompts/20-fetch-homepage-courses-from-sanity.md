# Fetch homepage courses from seeded Sanity content with improved and polished UI

## Goal

Replace the three hardcoded homepage course cards with server-rendered course data from the existing private Sanity dataset, while elevating the UI fidelity, visual polish, and layout to match the reference desktop screenshot (`design/lopsis-home.png`) and design system (`design/lopsis-designsystem.png`).

## Skills and guidance read

- `AGENTS.md` (Product rules, UI fidelity, Server/Client boundaries, verification requirements)
- `sanity-best-practices` (`~/.claude/skills/sanity-best-practices/SKILL.md`)
- `sanity-best-practices/references/nextjs.md`
- `sanity-best-practices/references/groq.md`
- Installed Next.js App Router Server Component data-fetching guidance in `node_modules/next/dist/docs/`

## Code and configuration inspected

- Reference designs: `design/lopsis-home.png` and `design/lopsis-designsystem.png`
- `app/page.tsx` (Server Component fetching `getCourses()`)
- `components/home-page.tsx` (Homepage presentational component)
- `components/site-header.tsx` (Shared header component)
- `components/design-system-page.tsx` (Design system reference tokens and components)
- `app/globals.css` (Homepage and course styling rules)
- `sanity/data/courses.ts` (Server-only data fetcher)
- `sanity/queries/courses.ts` (`COURSES_QUERY` and ordering)
- `sanity/queries/fragments.ts` (`COURSE_CARD_FRAGMENT` with `durationSeconds`)
- `sanity.types.ts` (Generated TypeGen types)
- `studio/scripts/seed/seed.ndjson` (Seeded course and lesson records)

## Decisions and assumptions

1. **Server-rendered real data**: Fetch courses in the root Server Component `app/page.tsx` via `getCourses()`, passing the first three courses to `HomePage`.
2. **Polished visual identity and logos**:
   - In `design/lopsis-home.png`, the 3 course cards feature crisp, recognizable, branded technology logos (Next.js black "N", Docker whale SVG with containers, TypeScript blue "TS").
   - If a course has an uploaded Sanity icon (`course.icon?.asset`), render it via `urlFor(course.icon)`.
   - When `course.icon` is absent (as in seeded data), provide dedicated, polished technology and subject marks mapped to the course:
     - **Next.js** (`nextjs-app-router-in-depth`): Black rounded square with crisp white "N" (`course-logo-next`), matching the reference design.
     - **Docker / DevOps** (`devops-with-docker-and-kubernetes`): Official Docker whale SVG with container cargo (`course-logo-docker`), matching the reference design.
     - **TypeScript** (`typescript-for-application-developers`): Classic blue `#3178C6` rounded square with white "TS" (`course-logo-typescript`), matching the reference design.
     - **Python** (`python-for-data-work`): High-fidelity Python logo SVG with distinctive blue and gold geometry.
     - **AI & LLMs** (`building-ai-apps-with-llms`, `retrieval-augmented-generation-from-scratch`): Sophisticated dark indigo gradient container with a polished AI sparkle emblem SVG.
     - **React** (`react-performance-engineering`): Deep navy container with vibrant cyan React atom SVG.
     - **PostgreSQL** (`postgresql-for-developers`): Signature slate/blue container with database emblem SVG.
     - **System Design** (`system-design-foundations`): Architectural nodes emblem SVG.
     - **Web Security** (`practical-web-security`): Emerald security shield emblem SVG.
   - For unmapped courses, render an elegant multi-tone monogram badge rather than a flat orange block.
3. **Elevated card typography, spacing, and micro-interactions**:
   - Card container: `background: #ffffff; border: 1px solid #e9ddd6; border-radius: 14px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);` with a subtle hover elevation (`transform: translateY(-3px); box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.08); border-color: #dfcebf;`).
   - Title: Playfair Display 22px, font-weight 500, line-height 1.25.
   - Summary: Inter 14px, line-height 1.65, color `#5e6572` with consistent min-height / vertical rhythm across varied copy lengths.
   - Metadata row: Increase font size from 10px to 12px (matching Inter Small 12/16 from the design system type scale), color `#525866`, gap 6px with icons.
4. **Derived aggregates**: Derive duration from lesson durations (`math::sum(modules[].lessons[]->durationSeconds)`) and format as e.g. `2h 27m` or `1h 59m`.
5. **No hardcoding of course data**: Real Sanity fields (`title`, `slug`, `summary`, `level`, `durationSeconds`, `moduleCount`) populate every card.
6. **Responsive and accessible**: Preserve semantic HTML (`<article>`, `<h3>`, `<nav>`, `<Link>`), correct ARIA labels on icons, and full mobile responsiveness down to 375px without horizontal scroll.

## Files expected to change

- `components/home-page.tsx` (Add rich technology logo library and course-aware icon resolution; adjust card typography, spacing, and metadata layout)
- `app/globals.css` (Update card styling, hover elevation, metadata font size, and technology logo classes)
- `sanity/queries/fragments.ts` (Ensure `durationSeconds` aggregate projection is present)
- `sanity.types.ts` (Preserve TypeGen type definitions)

## Requirements

### Data and server boundaries

- `app/page.tsx` must remain a Server Component awaiting `getCourses()`.
- No client-side Sanity fetches, tokens, or SDK writes.
- `HomePage` remains a presentational component receiving typed course objects.

### Visual fidelity and polish

- Replicate the visual excellence of `design/lopsis-home.png`.
- Ensure course cards have authentic, polished logos rather than monotone orange boxes.
- Metadata font size must be 12px with proper optical alignment and clean SVG icons.
- Cards must have polished hover transitions, subtle shadows, and uniform heights.
- Preserve the exact layout of the hero, search bar, header, and bottom glow.

### Accessibility and responsiveness

- All logos and icons must have accessible labels or `aria-hidden="true"`.
- Cards must wrap links with descriptive titles pointing to `/courses/[slug]`.
- Responsive behavior: 3 columns on desktop, stacking cleanly down to mobile without overflow.

## Security considerations

- Private dataset read token remains strictly server-side.
- No secrets exposed to client components or HTML bundles.
- All slugs and text sanitized through standard React JSX encoding.

## Acceptance criteria

1. The homepage renders the first three Sanity courses with real titles, summaries, levels, durations, and module counts.
2. Each course card renders a dedicated, polished technology logo (e.g. AI sparkle for Building AI Apps, Next.js black "N" for Next.js, Python logo for Python, Docker whale for Docker, etc.) matching the design system and screenshot.
3. If a course has a custom icon in Sanity, that uploaded icon is displayed.
4. Card metadata displays at 12px font size with crisp icons and accurate formatted durations.
5. Cards exhibit smooth hover elevation and subtle shadows matching the design system specs.
6. Clicking a course card title opens `/courses/[slug]` for that course.
7. Mobile and tablet viewports adapt cleanly with no horizontal scrolling.
8. `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with 0 errors.

## Checks to run

1. `npx tsc --noEmit` (TypeScript type check)
2. `npm run lint` (ESLint check)
3. `npm run build` (Production build verification)
4. Dev server inspection verifying `/` course card rendering, logo visuals, metadata, and link navigation.
5. Responsive verification at 1280px, 768px, and 375px.

## Exact manual test steps

1. Ensure `.env.local` is present with valid Sanity read token and project configuration.
2. Run `npm run build` to verify clean build output.
3. Start the dev server with `npm run dev` and navigate to `http://localhost:3000`.
4. Inspect the 3 course cards on the homepage:
   - Check that logos are distinct, crisp, and brand-accurate (e.g. Next.js black "N", AI sparkle badge, Python emblem).
   - Check that card titles, summaries, and metadata (level, duration, modules) are populated from Sanity.
   - Check that metadata text is clearly legible at 12px.
   - Hover over each card to verify smooth lift and shadow transitions.
5. Click on each course card title to verify navigation to `/courses/[slug]`.
6. Resize the browser viewport down to 375px to ensure cards stack gracefully without horizontal scrollbars.
