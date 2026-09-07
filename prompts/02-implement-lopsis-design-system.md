# Implement the Lopsis design system showcase

## Goal

Replace the default Next.js homepage with a responsive, production-quality implementation of the design-system board shown in `design/lopsis-designsystem.png`. Match the desktop reference closely while using **Lopsis** everywhere the source image says **Vertex**.

## Skills and guidance read

- No project skill is required. This is a code-native Next.js/Tailwind UI implementation with no Sanity, Clerk, search, migration, or generated-image work.
- Read the installed Next.js 16 guidance for App Router layouts/pages, CSS, and font optimization in `node_modules/next/dist/docs/01-app/01-getting-started/`.

## Code and configuration inspected

- `AGENTS.md`
- `package.json`
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `public/`
- `design/lopsis-designsystem.png` at 1024×1536
- Existing Git status, including unrelated user-owned changes and untracked project assets

## Decisions and assumptions

- Implement the board as the `/` page because the repository currently contains only the default homepage.
- Treat the supplied image as the visual source of truth for layout, spacing, typography, colors, component states, and content.
- Replace all visible `Vertex` branding with `Lopsis`; do not reproduce the obsolete product name from the image.
- Use Playfair Display for display typography and Inter for interface/body typography through `next/font/google`.
- Recreate the Lopsis triangular brand mark and the interface icons as accessible inline SVGs or small local React components. Do not add an icon dependency for this one page.
- Use semantic HTML and static server-rendered React. Buttons and controls demonstrate visual states only; no client-side state or backend behavior is required.
- Use reusable internal components and data arrays for repeated sections such as panels, swatches, icons, buttons, badges, cards, and principles, while avoiding a premature general-purpose component library.
- Preserve the wide board composition at desktop sizes. At smaller widths, stack the major panels and allow dense rows to wrap or scroll where needed without clipping the page.
- Do not implement dark mode because the reference defines a light design system only.

## Files expected to change

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- One or more local presentational component files under `components/design-system/` if decomposition materially improves readability
- No package or lockfile changes are expected

## Requirements

### Page frame and visual language

- Render a warm off-white page background and a centered board with the same compact, editorial density as the reference.
- Use subtle warm borders, white/cream panels, low-contrast shadows, and the exact documented design tokens where legible.
- Keep section numbers orange and section labels uppercase with tracked lettering.
- Remove all default Create Next App content and assets from the rendered page.

### Hero and foundations

- Reproduce the Lopsis logo lockup, `Design System` title, product description, version/date line, color palette, typography examples, type-scale table, spacing scale, and radius/shadow samples.
- Use the reference palette values: primary 500 `#F97316`, primary 400 `#FB923C`, primary 300 `#FDBA74`, primary 200 `#FED7AA`, primary 100 `#FFEEE5`; neutral 900 `#0F172A`, 700 `#334155`, 500 `#64748B`, 300 `#CBD5E1`, 200 `#E2E8F0`, 100 `#F1F5F9`, 50 `#FAFAFC`, and white `#FFFFFF`.
- Match the displayed Playfair Display and Inter scale, weights, and line heights.

### Components and patterns

- Reproduce both outline and filled icon rows with consistent 24px icon boxes.
- Reproduce default, hover, and disabled examples for primary, secondary, tertiary, and text buttons.
- Reproduce the search input, sort select, field specifications, video/lesson/popular badges, status indicators, and 35% progress bar.
- Reproduce the four card examples: course, video lesson, lesson result, and resource.
- Reproduce the navigation sample, breadcrumbs, pagination, and the four design principles.
- Preserve the shown copy unless it contains the old product name.

### Accessibility and responsiveness

- Maintain readable contrast, visible focus styles, proper button/input/select semantics, sensible headings, table semantics, and labels for non-text icons.
- Decorative SVGs must be hidden from assistive technology; meaningful icon-only controls must have accessible names.
- Desktop should closely match the 1024px reference proportions.
- Tablet and mobile should use a sensible stacked layout with no horizontal page overflow, clipped content, or unreadably small text.
- Respect reduced-motion preferences; avoid unnecessary animation.

## Security considerations

- Add no external scripts, browser tokens, remote APIs, or user-provided HTML.
- Use `next/font` so fonts are self-hosted by Next.js rather than fetched by the browser at runtime.
- Keep the page static and server-rendered; no client boundary is needed for visual demo states.
- Do not modify environment files or introduce secrets.

## Acceptance criteria

- `/` renders the complete Lopsis design-system board and no Create Next App starter UI.
- All fourteen numbered sections from the reference are present and visually ordered correctly.
- No user-facing `Vertex` text remains in the implementation.
- The primary/neutral tokens, typography, spacing, radii, shadows, controls, cards, navigation, and principles visibly match the reference.
- The page remains usable without horizontal page overflow at approximately 375px, 768px, 1024px, and wider desktop widths.
- The implementation contains no unnecessary client component or new runtime dependency.
- Type checking, linting, and the production build succeed.
- The dev server starts and `/` responds successfully.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Start `npm run dev`, request `/`, and confirm an HTTP success response.
- Search implementation files for stale `Vertex` branding.
- Inspect Git diff/status to ensure unrelated user-owned changes remain untouched.

## Exact manual test steps

1. Run `npm run dev` from `/home/dg/Projects/nextjs/lopsis`.
2. Open `http://localhost:3000/` in a desktop browser at a 1024px viewport width.
3. Compare the page top-to-bottom with `design/lopsis-designsystem.png`; confirm all fourteen sections, their order, typography, colors, spacing, control states, cards, and borders match closely.
4. Confirm the brand reads `Lopsis` and that no visible `Vertex` text appears.
5. Tab through the example controls and confirm focus is visible and the semantic controls remain keyboard reachable.
6. Resize to 768px and then 375px; confirm panels stack sensibly, dense content remains readable, and the document has no horizontal overflow.
7. Confirm the browser console has no runtime or hydration errors.
