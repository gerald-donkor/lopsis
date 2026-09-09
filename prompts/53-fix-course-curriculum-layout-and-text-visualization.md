# Fix Course Curriculum Toggle Button Overlap & Text Detail Visualization

## Goal

Resolve the layout defect where the "Show all / Show fewer modules" button (`.course-show-all`) is layered on top of and overlapping the course curriculum module content details and bottom border. Ensure that the course content text details (module titles, module summaries, durations, and lesson lists) are well visualised with clear readability, proper text wrapping, comfortable line height, and no clipping or truncation.

## Skills and guidance read

- `AGENTS.md` (Section 2 Workflow, Section 3 UI Work, Section 13 Checks to run, Section 15 Build Plan)
- `sanity-best-practices/SKILL.md`
- Installed Next.js App Router rules and responsive styling conventions in `app/globals.css`

## Code, configuration, and references inspected

- Screenshot provided by the user (`/home/dgk/Pictures/screenshot-2026-09-09_11-25-28.png`) showing the red circled "Show fewer modules" component positioned directly over the bottom of module 4 ("Reliability and Operations") and truncating/overlapping its text and border.
- Desktop visual reference `design/lopsis-course.png`.
- `components/course-curriculum.tsx` rendering `.course-curriculum-wrap`, `.course-module-list`, and `.course-show-all`.
- `components/course-page.tsx` rendering the course header, outcomes, curriculum container, and fixed progress strip.
- `app/globals.css` lines 320–415 styling `.course-content`, `.course-module-list`, `.course-module-button`, `.course-module-copy`, `.course-lesson-list`, and `.course-show-all`.

## Decisions and assumptions

1. **Button Positioning & Flow**:
   - The root cause of the visual overlap is `.course-show-all` having `position: absolute; right: 50%; bottom: 0; transform: translateX(50%); height: 47px;` within `.course-curriculum-wrap` which only has `padding-bottom: 26px;`. This forces the button 21px upwards directly into `.course-module-list`, occluding the bottom module row and its border.
   - Switch `.course-curriculum-wrap` to natural flex column layout (`display: flex; flex-direction: column; align-items: center;`).
   - Move `.course-show-all` out of absolute positioning into natural document flow with `position: static; transform: none; margin-top: 18px;`.
   - Keep the button centered horizontally, maintaining its clean pill/card design with refined hover states and transitions. It will render cleanly below the entire module list, never overlapping any module row, lesson, or border.

2. **Text Details Visualization**:
   - Currently `.course-module-copy strong` and `.course-module-copy > span` have `white-space: nowrap; text-overflow: ellipsis; overflow: hidden;` with tight line-height (`1.15`). This prematurely truncates summaries (e.g. "Knowing what your system is doing, and what it does when a dependency stops answering...") and cramps the text.
   - Update `.course-module-copy`:
     - Allow module titles (`strong`) to wrap naturally with `font: 500 15px/1.3 var(--font-playfair), Georgia, serif; color: #161719;`.
     - Allow module summary descriptions (`span`) to wrap with `font: 400 13px/1.45 var(--font-playfair), Georgia, serif; color: #5f6671; white-space: normal; word-break: break-word; overflow: visible;`.
     - Update `.course-module-button` padding and minimum height (`min-height: 64px; padding: 14px 22px 14px 19px;`) to comfortably accommodate multiline text without visual crowding.
   - Ensure the module list container retains clean borders (`border: 1px solid #eaded7; border-radius: 10px;`) and full width.
   - Preserve responsive behavior across desktop, tablet, and mobile viewports (<700px, <430px).

## Files expected to touch

- `app/globals.css`:
  - Update `.course-curriculum-wrap` styling to a flex container.
  - Update `.course-show-all` styling from absolute positioning to flow below the list.
  - Update `.course-module-copy` and child elements (`strong`, `span`) to wrap text cleanly and improve typography/readability.
  - Adjust `.course-module-button` padding for comfortable multiline text spacing.
- `components/course-curriculum.tsx` (only if semantic attributes or layout wrapper class updates are required).

## Requirements

1. The "Show all [N] modules" / "Show fewer modules" toggle button must be positioned completely below the module list container, with consistent spacing (`margin-top: 18px;` or equivalent).
2. The button must NEVER overlap or occlude any part of the course module rows, lesson list, or container borders, whether modules are expanded or collapsed.
3. The course module title and summary text details must not be truncated with ellipsis when there is space to wrap; they must wrap naturally with comfortable line-height (`1.45`) and high-contrast, legible typography (`#5f6671` on the warm background).
4. Expanding and collapsing modules (both individual modules and the full module list) must maintain clean alignment and prevent any element collision or visual cutoff.
5. All interactions (expanding modules, toggling all modules, clicking lessons) must retain PostHog analytics tracking and keyboard accessibility (`aria-expanded`, `aria-controls`).

## Security considerations

- This is a pure styling and presentation fix in client CSS/components. No tokens, auth boundaries, or API endpoints are affected.

## Acceptance criteria

- [ ] On `/courses/system-design-foundations` and all course detail pages, the "Show all / Show fewer modules" button is clearly positioned below the module list without overlapping any module row or border.
- [ ] Module titles and summary texts wrap cleanly and legibly across multiple lines without awkward ellipsis truncation or overflow clipping.
- [ ] Expanding individual modules displays lessons cleanly with ample vertical clearance.
- [ ] Collapsing and expanding modules works smoothly on both desktop and mobile viewports.
- [ ] TypeScript check (`npm run typecheck`) and ESLint (`npm run lint`) pass without errors.
- [ ] Production build (`npm run build`) completes successfully.

## Checks to run

1. `npm run typecheck` in the root workspace.
2. `npm run lint` in the root workspace.
3. `npm run build` in the root workspace.

## Manual test steps

1. Start the dev server (`npm run dev`) if not already running.
2. Navigate to `http://localhost:3000/courses/system-design-foundations`.
3. Scroll down to the "Course Content" section.
4. Verify that:
   - Module 4 ("Reliability and Operations") text ("Knowing what your system is doing, and what it does when a dependency stops answering.") is fully visible, cleanly wrapped, and easy to read.
   - The "Show fewer modules" / "Show all modules" button sits cleanly below the module list box with comfortable spacing and does not overlap the card or its bottom border.
5. Click on module rows to expand lessons; verify that lessons and the toggle button remain properly positioned.
6. Toggle "Show fewer modules" and "Show all modules" repeatedly; confirm smooth interaction and no layout shift/clipping.
7. Inspect the layout at mobile viewport (e.g. 375px width) and verify responsive typography and button placement.
