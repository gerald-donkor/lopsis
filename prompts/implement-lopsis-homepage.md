# Reimplement the Lopsis Homepage from the UI Reference

## Goal

Reimplement the responsive Lopsis homepage at `/` from the 1024 × 1536 desktop reference in `design/lopsis-home.png`. Match its layout, typography, spacing, borders, colors, shadows, iconography, and decorative framing as closely as practical, while replacing the reference's **Vertex** name with **Lopsis**.

### Approved follow-up revision

- Increase the centered desktop homepage canvas to approximately **1440px** wide.
- Preserve the reference's visual proportions by scaling the desktop content gutters and allowing the hero, search, course grid, announcement, and bottom decoration to use the wider canvas naturally.
- Keep the existing tablet and mobile breakpoints responsive with no horizontal overflow.

## Skills and guidance read

- Read `AGENTS.md` rules and project architecture guidelines.
- Read the installed Next.js 16.3.3 App Router guides for `page`, `layout`, `next/font`, and `next/link` in `node_modules/next/dist/docs/01-app/03-api-reference/`.
- No additional project skill is necessary: this is a presentational Next.js/Tailwind fidelity task rather than Sanity, Clerk, search, or content-modeling work.

## Code and configuration inspected

- `AGENTS.md`
- `package.json` (Next.js 16.3.3, React 19, Tailwind CSS v4)
- `app/layout.tsx` (Inter and Playfair Display fonts setup)
- `app/globals.css` (Tailwind v4 theme variables, typography, and utility classes)
- `app/page.tsx` (root page wrapper)
- `components/design-system-page.tsx` (Design system tokens, brand mark SVG, and icons)
- `components/home-page.tsx` (current partial homepage approximation to be reworked)
- `design/lopsis-home.png` (1024 × 1536 desktop source of truth)
- `prompts/implement-lopsis-homepage.md` (existing prompt updated for this request)

## Decisions and assumptions

- Keep `app/page.tsx` as a small Server Component wrapper and implement the presentational page in `components/home-page.tsx`.
- Treat `design/lopsis-home.png` as the exact visual source of truth for desktop layout, spacing, typography, colors, borders, shadows, icons, and copy.
- Replace all visible `Vertex` branding and copy with **Lopsis** (e.g. "Lopsis understands what you want to learn and finds the exact lessons across all your courses.").
- Use Playfair Display for display/section titles and Inter for interface/body typography via `next/font/google` already configured in `app/layout.tsx`.
- Recreate the Lopsis logo mark, interface icons, course marks, avatar treatment, hatched outer frame, and bottom stepped glow with inline SVG/CSS; do not add dependencies or use image generation.
- Preserve unrelated design-system styles and the existing `/design-system` route.
- Keep the page static and server-rendered. The search field is presentational in this task; it does not call an API or imply a search implementation.
- Make the page responsive down to mobile viewports (stacking course cards, wrapping navigation and search bar cleanly, maintaining readable typography and proper padding).
- Update `app/layout.tsx` metadata to reflect the Lopsis learning platform homepage.
- Search input and navigation links will be interactive with proper accessibility attributes, hover/focus states, and semantic HTML elements.

## Files expected to change

- `components/home-page.tsx`
- `app/globals.css` only if precise responsive or decorative styling cannot be expressed cleanly with existing Tailwind utilities
- `app/page.tsx` and `app/layout.tsx` only if their current wrapper or metadata needs correction
- No package or lockfile changes are required.

## Requirements

### 1. Navigation & Header
- Left: Lopsis orange logo mark + "Lopsis" brand name, followed by "Courses" and "My Learning" navigation links.
- Right: Notification bell icon button and learner avatar image / profile badge.
- Match the reference's non-floating top bar, subtle divider, and approximately 70px desktop height.

### 2. Hero Section
- Centered warm canvas with narrow diagonal-hatched gutters at desktop widths.
- "INTELLIGENT LEARNING" badge pill in uppercase with subtle peach background and orange border/text.
- Headline: "Search your learning in plain English." in bold Playfair Display serif.
- Subtitle: "Lopsis understands what you want to learn and finds the exact lessons across all your courses." in neutral-500 Inter.
- Primary CTA button: "Explore Courses →" with rich orange gradient, white text, right arrow, and subtle hover/active states.
- Search bar: Prominent centered search input with search icon, placeholder "Ask anything about your learning...", and `⌘ K` keyboard shortcut badge.

### 3. "All Courses" Section
- Header with "All Courses" in Playfair Display and "View all courses →" orange link with right arrow.
- 3-column responsive card grid:
  - **Next.js for Production**: Next.js "N" logo badge, title, summary, Intermediate level icon + label, 18h 24m duration icon + label, 12 modules icon + label.
  - **Docker Essentials**: Docker whale logo badge, title, summary, Beginner level icon + label, 10h 12m duration icon + label, 8 modules icon + label.
  - **TypeScript Deep Dive**: TypeScript "TS" logo badge, title, summary, Intermediate level icon + label, 14h 36m duration icon + label, 10 modules icon + label.
- Cards styled with the reference's thin warm borders, restrained radius, generous height, internal divider, and compact metadata.

### 4. Mid-page Divider & Decorative Graphic
- Centered divider with horizontal lines, orange outline star icon, and text: "New courses and lessons added every week."
- Bottom decorative stepped bars must span the canvas edge-to-edge and fade into the warm background like the reference.

### 5. Accessibility & Responsiveness
- Semantic HTML (`<header>`, `<main>`, `<nav>`, `<section>`, `<article>`).
- Keyboard navigation and visible focus rings.
- ARIA labels for icon-only buttons.
- Fully responsive across desktop (1024px+), tablet (768px), and mobile (375px) without horizontal scrolling.

## Security considerations

- Static UI implementation; no sensitive secrets, tokens, or external network requests in the client.
- Fonts self-hosted via `next/font`.
- Safe user avatar and SVG assets.

## Acceptance criteria

- At 1024 × 1536, `/` closely matches the geometry and visual hierarchy of `design/lopsis-home.png`, with **Lopsis** substituted for **Vertex**.
- At desktop viewports wider than 1440px, the main homepage canvas occupies approximately 1440px and remains centered.
- No instances of "Vertex" remain visible anywhere in the UI or metadata.
- All elements from the reference image (Header, Hero, Badge, Heading, Subtitle, CTA Button, Search Input, Course Cards with badges & metadata, Star Banner, Bottom Graphic) are faithfully implemented.
- The page is fully responsive down to mobile viewports (375px) without horizontal overflow or overlapping text.
- `app/design-system` continues to function properly.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.
- The development server returns HTTP 200 for `/` and `/design-system`.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev` verification with HTTP 200 response on `/` and `/design-system`
- Verify no homepage or metadata occurrence of "Vertex" remains; do not rewrite references in the source design PNG.

## Exact manual test steps

1. Start development server: `npm run dev`.
2. Open `http://localhost:3000/` in a desktop browser at 1024px+ width.
3. Compare the rendered homepage against `design/lopsis-home.png`:
   - Verify Lopsis branding and logo mark in header.
   - Verify "Courses" and "My Learning" navigation links.
   - Verify notification bell and learner avatar.
   - Verify "INTELLIGENT LEARNING" badge pill.
   - Verify "Search your learning in plain English." serif headline.
   - Verify "Lopsis understands what you want to learn..." subtitle.
   - Verify "Explore Courses →" button styling and hover state.
   - Verify search input with icon and `⌘ K` badge.
   - Verify "All Courses" section heading and "View all courses →" link.
   - Verify all 3 course cards (Next.js, Docker, TypeScript) with their specific icons, titles, descriptions, and metadata rows (level, duration, modules).
   - Verify star divider: "New courses and lessons added every week."
   - Verify bottom stepped gradient graphic.
4. Verify `/design-system` still renders the design system board properly.
5. Test responsive resizing down to 768px and 375px viewports to verify layout adapts gracefully with no horizontal overflow.
6. Verify keyboard navigation with Tab key and visible focus states on all interactive elements.
