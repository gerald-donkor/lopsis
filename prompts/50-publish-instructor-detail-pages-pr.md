# Publish Instructor Detail Pages and Profile UI Pull Request

## Goal

Create a new branch `feat/instructor-detail-pages` from current HEAD / `main`, stage and commit all changes separately based on their context using conventional commit messages, push the branch to `origin`, and open a pull request targeting `main`.

---

## Skills and project guidance read

- `AGENTS.md`:
  - Section 1: maintain the Lopsis brand and learning platform scope.
  - Section 2: follow the prompt-approval-execution loop, keep commits contextual and clean.
  - Section 5: enforce server/client boundaries (server-only data fetch for instructor, client components for interactive cards).
  - Section 13: run unit tests, type check, lint, and build verification before publishing.
  - Section 15, Task 5: Instructor Detail Pages (`/instructors/[slug]`) & Profile UI.
- Previous PR publication prompts (`prompts/34-*`, `prompts/38-*`, `prompts/44-*`, `prompts/46-*`).
- GitHub CLI (`gh pr create`).

---

## Code and repository state inspected

- Current branch: `feat/lesson-page-interactivity-and-video-resume` (whose PR #15 was merged into `main` at `7ea8851`).
- Working tree uncommitted changes:
  1. `components/course-card.tsx`: extracted reusable `CourseCard` client component with learner progress, resume affordance, and analytics.
  2. `components/all-courses-page.tsx`: refactored catalog page to import and render shared `CourseCard`.
  3. `app/instructors/[slug]/page.tsx`: dynamic server component route with `generateMetadata`, `getInstructorBySlug`, and `notFound()`.
  4. `components/instructor-page.tsx`: instructor profile UI with photo/fallback, Playfair heading, expertise badges, Portable Text bio, breadcrumbs, and course grid.
  5. `app/globals.css`: scoped `.instructor-*` styles and responsive breakpoints.
  6. `prompts/49-instructor-detail-pages.md`: task implementation prompt.
  7. `AGENTS.md`: build plan Task 5 updated to `[x]`.
  8. `prompts/50-publish-instructor-detail-pages-pr.md`: this publication prompt.

---

## Decisions and assumptions

1. **Branch creation**:
   - Create and checkout branch `feat/instructor-detail-pages`.
2. **Contextual commits**:
   - **Commit 1 (`refactor(courses)`)**:
     - Files: `components/course-card.tsx`, `components/all-courses-page.tsx`
     - Message: `refactor(courses): extract reusable CourseCard component`
     - Summary: Extract the catalog course card into a reusable client component supporting both catalog and instructor views with full progress and analytics preservation.
   - **Commit 2 (`feat(instructors)`)**:
     - Files: `app/instructors/[slug]/page.tsx`, `components/instructor-page.tsx`, `app/globals.css`
     - Message: `feat(instructors): add instructor detail pages and profile UI`
     - Summary: Implement public `/instructors/[slug]` dynamic route, SEO metadata, 404 handling, profile hero with photo and Portable Text biography, and responsive catalog course grid.
   - **Commit 3 (`docs`)**:
     - Files: `prompts/49-instructor-detail-pages.md`, `prompts/50-publish-instructor-detail-pages-pr.md`, `AGENTS.md`
     - Message: `docs: mark instructor detail pages complete and document pr publication`
     - Summary: Record implementation prompts and update the Section 15 build plan task status for Task 5.
3. **Pull request targeting `main`**:
   - Target base: `main` (since PR #15 is already merged into `main`).
   - Title: `feat: instructor detail pages (/instructors/[slug]) and profile UI`
   - Description: Overview of extracted course card component, new instructor profile route, Portable Text biography rendering, responsive styling, and verification results.

---

## Expected files to touch / commit

- `components/course-card.tsx`
- `components/all-courses-page.tsx`
- `app/instructors/[slug]/page.tsx`
- `components/instructor-page.tsx`
- `app/globals.css`
- `prompts/49-instructor-detail-pages.md`
- `prompts/50-publish-instructor-detail-pages-pr.md`
- `AGENTS.md`

---

## Security considerations

- Verify no secret tokens (`SANITY_API_WRITE_TOKEN`, Clerk secret keys) or `.env` files are tracked or staged.
- Standard fast-forward/clean push with `git push -u origin feat/instructor-detail-pages`. Never use `--force`.

---

## Acceptance criteria

1. Branch `feat/instructor-detail-pages` is created and active.
2. 3 focused, contextual commits are recorded with clear conventional commit messages.
3. Working directory is completely clean after commits (`git status` clean).
4. Branch is pushed to `origin/feat/instructor-detail-pages`.
5. Pull request is opened against `main` using `gh pr create`.
6. All pre-publication checks (`npm run test:unit`, `npx tsc --noEmit`, `npm run lint`) pass.

---

## Checks to run

```bash
git status
npm run test:unit
npx tsc --noEmit
npm run lint
gh pr view
```

---

## Manual test steps

1. Inspect `git log -n 3 --oneline` to verify the three contextual commits.
2. Verify `gh pr list` displays the newly opened PR targeting `main`.
3. Check the PR URL on GitHub to verify commit list and diff contents.
