# Implement My Learning Page (/my-learning) with In Progress, Completed, and Bookmarked Views

## Goal

Implement Task 6 from the Lopsis build plan: create the `/my-learning` route and interactive dashboard component (`components/my-learning-page.tsx`) that surfaces personal learning progress and saved bookmarks for learners.

The implementation must:

1. Add a public App Router page at `app/my-learning/page.tsx` with platform metadata (`My Learning — Lopsis`) that fetches published courses server-side using the existing Sanity data helper.
2. Build an interactive client component `components/my-learning-page.tsx` matching the Lopsis design system, styled with the warm shell, canvas, Playfair Display typography, and responsive container layout.
3. Render a friendly signed-out state prompting unauthenticated visitors to sign in or create an account with Clerk to track course progress and access saved bookmarks.
4. Render an authenticated dashboard with three distinct, accessible view tabs:
   - **In Progress**: Courses the learner has started (has recorded progress or completed lessons, but not yet 100% complete), reusing `CourseCard` to render the progress bar, lesson count, and direct "Resume" affordance.
   - **Completed**: Courses with 100% completion, reusing `CourseCard` to display the completed badge and "Review Course" CTA.
   - **Bookmarked**: Saved courses and lessons, displaying bookmarked courses using `CourseCard` and bookmarked lessons with lesson titles, links to `/lessons/[slug]`, bookmark date, and a quick unbookmark action.
5. Provide truthful, motivating empty states for each tab with direct "Explore Catalog" CTAs pointing to `/courses`.
6. Include PostHog telemetry capturing dashboard views and tab interactions without leaking sensitive user information.

---

## Skills and project guidance read

- `AGENTS.md`:
  - Section 1: Product name is strictly **Lopsis**. Never use Vertex. Keep scope strictly to the learning platform.
  - Section 3: Reproduce existing layout, spacing, typography, color, and states. Reuse existing Tailwind patterns and components (`CourseCard`, `SiteHeader`) before creating new ones. Ensure responsive design down to 320px mobile width.
  - Section 5: Keep responsibilities separate. Pages are read-only. Clerk secret key stays server-only; browser receives only the publishable key. Private Sanity dataset is read via server-only helpers. The browser never writes directly to Sanity.
  - Section 7: My Learning is a presentational surface reading existing progress for display, with no backend of its own. Learner progress keys off Clerk user ID.
  - Section 8: Model requirements — Course has title, slug, cover image, instructor, category, moduleCount, lessonCount. Progress record captures completed lessons and last resume position per learner.
  - Section 13: Run type check, lint, production build, unit tests, and development server check.
  - Section 15, Task 6:
    - Route `app/my-learning/page.tsx` with metadata.
    - Component `components/my-learning-page.tsx`.
    - Signed-out view: Clean banner prompting user to sign in or create an account with Clerk.
    - Signed-in view with tabs:
      - **In Progress**: Cards for enrolled courses showing progress bar, lessons completed count, and direct "Resume Lesson" CTA.
      - **Completed**: Cards for courses with 100% progress, showing completed badge and "Review Course" CTA.
      - **Bookmarked**: List of saved courses and lessons.
    - Empty state when no courses have been started, pointing to `/courses`.
- Next.js local docs (`node_modules/next/dist/docs/`):
  - App Router conventions: static metadata in Server Component page, client component leaf for reactive state.
  - Public route remains accessible; Clerk client-side `useAuth()` detects authentication state without throwing or forcing redirect.

---

## Code and configuration inspected

- `components/site-header.tsx`:
  - Navigation contains `<Link href="/my-learning">My Learning</Link>`. Currently clicking this link results in a 404.
- `app/courses/page.tsx`:
  - Server Component pattern fetching courses using `getCourses()` from `@/sanity/data/courses`.
- `sanity/data/courses.ts`:
  - `getCourses()` queries `COURSES_QUERY` and returns `COURSES_QUERY_RESULT` with cache tags `['course', 'lesson', 'instructor', 'category']`.
- `components/course-card.tsx`:
  - Reusable client component extracted in Task 5.
  - Accepts `course: CourseCardData` (`COURSES_QUERY_RESULT[number]`).
  - Connects to `useLearnerProgress()` to render:
    - In-progress bar and completion percentage (`X% complete`).
    - Lessons completed count (`Y of Z lessons`).
    - Direct "Resume" button routing to `getCourseResumeHref(course.slug, progress.lastLessonSlug, progress.lastPositionSeconds)` with arrow icon.
    - Secondary "Details" link to `/courses/[slug]`.
    - Completed state with checkmark icon and "Completed · Review course ->" action.
- `lib/progress/use-learner-progress.ts` & `lib/progress/progress-provider.tsx`:
  - `useLearnerProgress()` provides:
    - `records: Record<string, ProgressRecord>`: Map of courseId to progress record.
    - `isLoading: boolean`: Loading state for learner progress.
    - `isSignedIn: boolean`: Authentication status from Clerk.
    - `getCourseProgress(courseId, totalLessons)`: Returns `CourseProgressSummary` (`completedCount`, `percentage`, `isCompleted`, `lastLessonId`, `lastLessonSlug`, `lastPositionSeconds`).
    - `isLessonCompleted(courseId, lessonId)`: Checks if a lesson is completed.
- `lib/bookmarks/use-bookmarks.ts`:
  - `useBookmarks()` provides:
    - `bookmarks: BookmarkItem[]`: Persisted array of bookmarks (`{ id, type: 'course' | 'lesson', title, slug, bookmarkedAt }`).
    - `isLoaded: boolean`: External store hydration status.
    - `isBookmarked(id)`: Checks if an ID is bookmarked.
    - `removeBookmark(id)`: Removes a bookmark by ID.
    - `toggleBookmark(item)`: Toggles bookmark.
- `components/auth-controls.tsx`:
  - Demonstrates Clerk's `<SignInButton>` and `<SignUpButton>` usage with styled buttons.
- `app/globals.css`:
  - Established `.catalog-shell`, `.catalog-canvas`, `.catalog-main`, `.catalog-heading`, `.catalog-eyebrow`, `.catalog-grid`, `.catalog-empty`, and `.catalog-card` styles.

---

## Decisions and assumptions

1. **Route is a Server Component with client interactive leaf**
   - `app/my-learning/page.tsx` is an async Server Component that fetches published courses using `getCourses()`.
   - It passes `courses` as a prop to `<MyLearningPage courses={courses} />`.
   - The route remains public so that unauthenticated visitors can navigate to it from the header without encountering a 404 or an abrupt redirect.

2. **Clean separation of pure filter logic for testability**
   - Place pure filtering logic in `lib/progress/my-learning.ts`:
     - `getInProgressCourses(courses, getCourseProgress, isSignedIn)`: Filters courses where progress has started (`completedCount > 0 || lastLessonSlug || lastLessonId`) but `!isCompleted`.
     - `getCompletedCourses(courses, getCourseProgress, isSignedIn)`: Filters courses where `isCompleted === true`.
     - `partitionBookmarks(bookmarks, courses)`: Splits stored bookmarks into bookmarked courses (matched to Sanity course documents) and bookmarked lessons.
   - Write comprehensive unit tests in `lib/progress/my-learning.test.ts`.

3. **Reuse `CourseCard` without duplication**
   - Use the shared `CourseCard` for both "In Progress" and "Completed" views.
   - `CourseCard` already encapsulates progress bars, percentage, lesson counters, "Resume" action with timestamp routing, and "Completed · Review course" badges.
   - For bookmarked courses that exist in the Sanity catalog, render them using `CourseCard`.

4. **Dedicated card presentation for Bookmarked Lessons**
   - Lessons do not share the full course card schema (they are timestamped chunks/videos within a course).
   - Render bookmarked lessons with:
     - Lesson icon and title linking to `/lessons/[slug]`.
     - Bookmark timestamp (formatted cleanly).
     - Direct "Open Lesson" CTA with arrow icon.
     - Unbookmark button allowing learners to remove the bookmark directly from the dashboard.

5. **Accessible tab interface**
   - Use standard WAI-ARIA tab pattern:
     - `role="tablist"` on container with `aria-label="Learning dashboard views"`.
     - `role="tab"` with `aria-selected` and `aria-controls` on buttons.
     - `role="tabpanel"` on content area with `aria-labelledby`.
     - Keyboard navigation: Left/Right arrow keys navigate between tabs, Enter/Space selects.
   - Tab pills display item counts (e.g., "In Progress (2)", "Completed (1)", "Bookmarked (4)").

6. **PostHog instrumentation**
   - Capture `my_learning_viewed` on initial load.
   - Capture `my_learning_tab_changed` with `{ tab: activeTab }`.
   - Capture `my_learning_bookmark_removed` when a user unbookmarks from the dashboard.

---

## Expected files to touch

1. `app/my-learning/page.tsx` (new)
   - Server Component route fetching catalog courses and rendering `MyLearningPage`.
2. `components/my-learning-page.tsx` (new)
   - Interactive client dashboard component with signed-out banner, tabs, empty states, and cards.
3. `lib/progress/my-learning.ts` (new)
   - Pure helper functions for filtering in-progress courses, completed courses, and partitioning bookmarks.
4. `lib/progress/my-learning.test.ts` (new)
   - Unit tests covering course filtering, bookmark partitioning, and unauthenticated behavior.
5. `app/globals.css`
   - Scoped styles for `.my-learning-*`: tablist, tab pills, signed-out banner, bookmarked lesson cards, and mobile responsiveness.
6. `AGENTS.md`
   - Update Task 6 in Section 15 to reference `prompts/51-my-learning-page.md` and mark complete once executed.

---

## Detailed requirements

### 1. Route `app/my-learning/page.tsx`

- Export static metadata:
  ```ts
  export const metadata: Metadata = {
    title: "My Learning — Lopsis",
    description: "Track your course progress, resume recent lessons, and revisit saved bookmarks.",
  };
  ```
- Fetch courses via `const courses = await getCourses();`.
- Render `<MyLearningPage courses={courses} />`.

### 2. Dashboard Component `components/my-learning-page.tsx`

- Use `"use client"`.
- Read authentication state with `useAuth()` from `@clerk/nextjs`.
- Read progress with `useLearnerProgress()`.
- Read bookmarks with `useBookmarks()`.
- Shell layout:
  - `.catalog-shell.my-learning-shell` with `.catalog-canvas.my-learning-canvas`.
  - Global `SiteHeader`.
  - Breadcrumb: `All Courses > My Learning`.
  - Header with eyebrow `Learner Dashboard`, title `My Learning`, and subtitle.
- **Signed-Out State**:
  - Render when `!isSignedIn`.
  - Display friendly prompt card with graduation/book icon, clear explanation of features, and Clerk `<SignInButton>` ("Sign In") and `<SignUpButton>` ("Create Free Account") buttons.
  - Include secondary link to explore courses (`/courses`).
- **Signed-In State**:
  - Render tab list with 3 tabs:
    1. **In Progress** (`count`: in-progress courses)
    2. **Completed** (`count`: completed courses)
    3. **Bookmarked** (`count`: total bookmarks)
  - Keyboard navigation: Left/Right arrow keys change focus/tab.
  - Active tab state stored in React state (default `"in-progress"`).
  - Empty states when a tab has 0 items:
    - Display clear explanation and an action button linking to `/courses`.
- **In-Progress Tab**:
  - Filter courses where `hasProgress && !progress.isCompleted`.
  - Render courses in `.catalog-grid` using `<CourseCard course={course} />`.
- **Completed Tab**:
  - Filter courses where `hasProgress && progress.isCompleted`.
  - Render courses in `.catalog-grid` using `<CourseCard course={course} />`.
- **Bookmarked Tab**:
  - Separate saved items into:
    - Bookmarked courses: Match against Sanity `courses` and render via `<CourseCard />`.
    - Bookmarked lessons: Render in `.my-learning-lessons-grid` with lesson title, slug link, bookmark date, and an unbookmark button calling `removeBookmark(lesson.id)`.

### 3. Styling in `app/globals.css`

- `.my-learning-tabs`: Flex container with gap, border-bottom, and accessible tab buttons.
- `.my-learning-tab`: Pill or underlined button with active highlight (`#e9532d`), count badge, and keyboard focus rings.
- `.my-learning-auth-banner`: Card with warm gradient, clean typography, and styled Clerk auth buttons.
- `.my-learning-lesson-card`: Distinct, elegant card for saved lessons with hover elevation, direct action link, and accessible remove button.
- Responsive breakpoints for tablet and mobile down to 320px.

---

## Security and architectural boundaries

- The route is public; browsing is never blocked by an unhandled auth rejection.
- Private Sanity dataset is queried solely server-side via `getCourses()`. No Sanity API token is exposed to the browser.
- Clerk secret key remains strictly server-only. Only Clerk publishable key reaches the browser.
- Learner progress and bookmarks are read-only on this surface (bookmarks can be removed locally via `useBookmarks`).
- No arbitrary HTML injection (`dangerouslySetInnerHTML`) or unvalidated URLs. External and internal links use safe Next.js conventions.

---

## Acceptance criteria

1. Visiting `/my-learning` renders without error and displays metadata titled `My Learning — Lopsis`.
2. When signed out, the page displays a clean, welcoming invitation card with functional Clerk Sign In and Sign Up buttons.
3. When signed in, the page displays the three tabs with live count badges: "In Progress", "Completed", and "Bookmarked".
4. Courses with started lessons appear in the "In Progress" tab with progress percentage, lesson count, and "Resume" CTA.
5. Courses with 100% completion appear in the "Completed" tab with the "Completed" badge and "Review course" CTA.
6. Bookmarked courses and lessons appear in the "Bookmarked" tab. Removing a bookmark from the dashboard updates the list immediately.
7. Empty states render motivating messages and a link to `/courses` when a tab has no items.
8. The tab list is accessible via keyboard (arrow keys, Enter/Space) and follows WAI-ARIA tablist patterns.
9. Layout is fully responsive across desktop, tablet, and 320px mobile viewports without horizontal scrolling.
10. All unit tests pass, TypeScript compiles cleanly with `tsc --noEmit`, and ESLint passes with zero warnings or errors.

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

Verify that unit tests pass, type check reports 0 errors, lint passes, the Next.js production build succeeds, and the dev server starts and handles `/my-learning` correctly in both signed-out and signed-in scenarios.

---

## Exact manual test steps

1. Start the web application: `npm run dev`.
2. In an incognito window (signed out):
   - Navigate to `/` and click the "My Learning" link in the header.
   - Verify navigation to `/my-learning` succeeds without a 404.
   - Verify the breadcrumb, page heading ("My Learning"), and signed-out invitation banner render.
   - Click the "Sign in" button and verify Clerk's sign-in modal/flow opens.
3. Sign in as a test learner:
   - Verify the page displays the learner dashboard with the three tabs: "In Progress", "Completed", "Bookmarked".
   - Confirm each tab displays an accurate count pill.
4. Test "In Progress" view:
   - If courses have been started, verify they appear in the grid with accurate progress tracks and "Resume" buttons.
   - Click "Resume" on a card and verify it deep links to the lesson at the correct timestamp.
5. Test "Completed" view:
   - If a course has 100% completion, verify it appears with the "Completed · Review course" badge.
6. Test "Bookmarked" view:
   - Navigate to a course or lesson and toggle the bookmark icon.
   - Return to `/my-learning` and select the "Bookmarked" tab.
   - Verify the bookmarked item appears.
   - Click the unbookmark button on a bookmarked lesson card and verify it is removed immediately.
7. Test empty states:
   - Switch to a tab with 0 items.
   - Verify the empty state renders with the "Explore courses" button.
   - Click "Explore courses" and confirm navigation to `/courses`.
8. Test keyboard accessibility:
   - Use the Tab key to focus the tablist, then use Left/Right arrow keys to switch tabs.
   - Confirm focus rings are visible and high-contrast.
9. Test mobile responsiveness:
   - Resize browser to 375px and 320px widths.
   - Verify header, tab bar, cards, and buttons wrap cleanly without horizontal scrollbars.
