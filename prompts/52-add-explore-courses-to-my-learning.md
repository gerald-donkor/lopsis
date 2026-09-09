# Add "Explore courses" Actions and Persistent Navigation to My Learning Page

## Goal

Resolve the issue where the "Explore courses" call-to-action is missing from the My Learning page (`/my-learning`) when a learner has courses in progress but 0 completed courses (as shown in the user's screenshot), and provide persistent catalog exploration across all My Learning views.

Specifically:
1. In the **Completed** tab empty state, render both **"View courses in progress"** (primary action when in-progress courses exist) AND **"Explore courses"** (secondary action linking to `/courses`), instead of hiding the catalog link behind the conditional check.
2. In the **In Progress** and **Bookmarked** tab empty states, standardize the button text to **"Explore courses"** and style it with `.my-learning-btn` for visual prominence.
3. In the **Dashboard Tabs header**, add a persistent **"Explore courses &rarr;"** action aligned to the right (`margin-left: auto`), allowing learners to jump to the course catalog from any active tab regardless of enrollment state.
4. Update styling in `app/globals.css` to support `.my-learning-tab-explore` and `.my-learning-empty-actions`.

---

## Skills and project guidance read

- `AGENTS.md`:
  - Section 1: Product name is **Lopsis**. Keep scope strictly to the learning platform.
  - Section 3: Visual fidelity. Match existing typography, colors, button styles, and responsive layout.
  - Section 5: Maintain component boundaries (read-only presentation, client interactivity).
  - Section 13: Run type check, lint, unit tests, and production build.
  - Section 15, Task 6: Empty state when no courses have been started, pointing to `/courses`.
- Inspected code:
  - `components/my-learning-page.tsx`: Lines 283-328 and 410-420 where `.catalog-empty` renders empty state text and links.
  - `app/globals.css`: `.catalog-empty`, `.my-learning-switch-btn`, `.my-learning-btn`, `.my-learning-tabs`.
  - Screenshot `/home/dgk/Pictures/screenshot-2026-09-09_11-15-55.png`: shows active tab "Completed 0" with "No completed courses yet" and only "View courses in progress ->".

---

## Decisions and assumptions

1. **Both actions available in Completed empty state**:
   - When a user has started courses (`inProgressCourses.length > 0`), the Completed empty state should allow switching back to in-progress courses (`View courses in progress`) OR exploring new courses (`Explore courses`).
   - Group both buttons in `.my-learning-empty-actions` with clean spacing and responsive wrapping.
2. **Standardized copy and button styling**:
   - Use the exact text **"Explore courses"** (matching the homepage hero CTA and user terminology).
   - Use `.my-learning-btn` classes (`my-learning-btn-primary` or `my-learning-btn-secondary`) instead of unstyled underline text.
3. **Persistent Tab Bar exploration link**:
   - Add `<Link href="/courses" className="my-learning-tab-explore">Explore courses <ArrowRight /></Link>` inside the tab bar container with `margin-left: auto`.
   - On mobile viewports (< 640px), ensure the link wraps or remains accessible without breaking the tab scroll/flow.

---

## Expected files to touch

1. `components/my-learning-page.tsx`
   - Add `.my-learning-tab-explore` in the tablist.
   - Update empty state actions in In Progress, Completed, and Bookmarked panels.
2. `app/globals.css`
   - Add `.my-learning-tab-explore` styling (flex align, font size, color `#e9532d`, hover transition).
   - Add `.my-learning-empty-actions` styling (flex, gap 12px, wrap, center align).

---

## Acceptance criteria

1. On the "Completed" tab when in-progress courses exist, learners see both "View courses in progress" and "Explore courses".
2. On the "In Progress" tab empty state, the CTA is a styled button labeled "Explore courses" linking to `/courses`.
3. On the "Bookmarked" tab empty state, the CTA is a styled button labeled "Explore courses" linking to `/courses`.
4. The dashboard tab bar displays an "Explore courses &rarr;" action on the right side across all views.
5. All buttons and links route correctly to `/courses`.
6. Full responsiveness down to 320px width without horizontal overflow.
7. `npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass cleanly.

---

## Checks to run

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm run build
```

---

## Exact manual test steps

1. Navigate to `http://localhost:3000/my-learning`.
2. Observe the persistent "Explore courses &rarr;" link on the right of the tab bar.
3. Click the "Completed" tab (with 0 completed courses, 1 in progress):
   - Confirm both "View courses in progress" and "Explore courses" are visible.
   - Click "Explore courses" and verify it navigates to `/courses`.
4. Switch to an empty tab (e.g. Bookmarked or In Progress if 0):
   - Confirm the prominent "Explore courses" button renders.
