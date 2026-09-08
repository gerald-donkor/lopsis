# Implement Catalog & Home Page Progress Affordances, Instructor Links, and Keyboard Shortcut

## Goal

Connect the Course Catalog page (`/courses`, `components/all-courses-page.tsx`) and Homepage (`/`, `components/home-page.tsx`) to learner progress and enhanced interactivity:
1. Wire `CourseCard` on both pages to `useLearnerProgress` to display progress bars, completion percentages (`X% complete`), and lesson counts for enrolled/in-progress courses.
2. Provide a direct, one-click "Resume" affordance on cards for courses in progress, navigating directly to the learner's last lesson with preserved start timestamp (`/lessons/[slug]?start=[seconds]`).
3. For completed courses (100%), display a completion status indicator and adapt the action CTA to "Review course".
4. For unstarted courses or signed-out users, preserve the pristine visual design matching the reference images (`design/lopsis-home.png`).
5. Make instructor bylines (`By {course.instructor.name}`) on the catalog cards clickable links to `/instructors/[slug]` with hover feedback and PostHog analytics.
6. Implement the `⌘ K` / `Ctrl+K` keyboard shortcut on the Homepage to automatically focus and highlight the search input from anywhere on the page.

---

## Guidance read and code inspected

- `AGENTS.md`:
  - **Section 1**: Product name is Lopsis.
  - **Section 3**: UI fidelity. Reproduce reference designs (`design/lopsis-home.png`, `design/lopsis-designsystem.png`) exactly: layout, typography, colors, and responsive behavior.
  - **Section 5**: Responsibilities and boundaries. Pages are read-only; browser never writes progress directly. Learner state is kept apart from read-only Sanity content.
  - **Section 7**: Progress is tracked per learner. Surface it as completion marks and a resume affordance on the catalog, course, and lesson pages. Product analytics is PostHog (`catalog_instructor_clicked`, `course_resume_clicked`, `search_shortcut_used`).
  - **Section 8**: Data models. Course has `title`, `slug`, `instructor`, `moduleCount`, `lessonCount`, `durationSeconds`. Instructor has `name`, `slug`, `photo`, `expertise`.
  - **Section 12**: Safe client boundaries and error handling.
  - **Section 13**: Checks to run (`npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, `npm run build`).
  - **Section 15**: Task 3 specification:
    - Update `CourseCard` in `components/all-courses-page.tsx` and `components/home-page.tsx` to read learner progress.
    - Display progress bar and completion percentage (`X% complete`) for enrolled/in-progress courses.
    - Add quick "Resume" affordance routing to the learner's last lesson.
    - Link instructor bylines (`By {course.instructor.name}`) to `/instructors/[slug]`.
    - Add `⌘ K` / `Ctrl+K` keyboard event listener on the Homepage search input.

- Inspected Codebase Files:
  - `components/all-courses-page.tsx`: Catalog layout, `CourseCard` with cover image, category, static instructor byline, title, summary, meta pills, and "View course" action.
  - `components/home-page.tsx`: Homepage hero, search form with `<kbd>⌘ K</kbd>`, course grid, and `CourseCard` with icon, title, summary, and meta pills.
  - `lib/progress/types.ts` & `lib/progress/progress-provider.tsx`: `useLearnerProgress` hook providing `getCourseProgress(courseId, totalLessons)` returning `CourseProgressSummary` (`percentage`, `completedCount`, `isCompleted`, `lastLessonSlug`, `lastPositionSeconds`).
  - `sanity/queries/fragments.ts`: Confirmed `COURSE_CARD_FRAGMENT` projects `lessonCount: count(modules[].lessons[])`, `durationSeconds`, `instructor->{ _id, name, "slug": slug.current, ... }`.
  - `app/globals.css`: Styles for `.catalog-card`, `.catalog-card-context`, `.home-course-card`, `.home-course-meta`, and design-system tokens for `.progress-track` and `.badge`.

---

## Decisions and assumptions

1. **Progress Hook Integration**:
   - Both `components/all-courses-page.tsx` and `components/home-page.tsx` are already `"use client"` components wrapped inside `LearnerProgressProvider` in `app/layout.tsx`.
   - In each `CourseCard`, call `useLearnerProgress()` to obtain `getCourseProgress` and `isSignedIn`.
   - For each course, calculate progress: `const progress = getCourseProgress(course._id, course.lessonCount ?? 0);`.
   - A course is considered started/in-progress when `isSignedIn && (progress.completedCount > 0 || Boolean(progress.lastLessonSlug || progress.lastLessonId))`.

2. **Resume URL Construction**:
   - When `progress.lastLessonSlug` is present:
     - If `progress.lastPositionSeconds && progress.lastPositionSeconds > 0`:
       `/lessons/${progress.lastLessonSlug}?start=${Math.floor(progress.lastPositionSeconds)}`
     - Otherwise: `/lessons/${progress.lastLessonSlug}`
   - Fallback if `lastLessonSlug` is not recorded but course has progress: `/courses/${course.slug}` (which dynamically resolves to the next incomplete lesson).

3. **Catalog Page Card (`components/all-courses-page.tsx`)**:
   - **Instructor link**:
     - When `course.instructor?.name` and `course.instructor?.slug` are present, render `<Link href={`/instructors/${course.instructor.slug}`} className="catalog-card-instructor">By {course.instructor.name}</Link>`.
     - Stop click event propagation to prevent triggering parent card navigation if wrapped.
     - Capture `posthog.capture("catalog_instructor_clicked", { instructor_id: course.instructor._id, instructor_slug: course.instructor.slug, course_id: course._id })`.
   - **Progress display**:
     - When in-progress (`hasProgress && !progress.isCompleted`):
       Render a `.catalog-card-progress` block containing:
       - `.catalog-card-progress-track` with `<span style={{ width: `${progress.percentage}%` }} />`.
       - Text labels: `${progress.percentage}% complete` and `${progress.completedCount} of ${course.lessonCount ?? 0} lessons`.
     - When completed (`hasProgress && progress.isCompleted`):
       Render progress track at 100% and a "Completed" badge indicator.
   - **Card Actions**:
     - When in-progress:
       Render a primary "Resume" button with `<ArrowRight />` linking to `resumeHref`, alongside an "Overview" / "Details" link to `/courses/${course.slug}`.
     - When completed:
       Render "Review course" linking to `/courses/${course.slug}`.
     - When unstarted or signed out:
       Render standard "View course" action with `<ArrowRight />` unchanged.

4. **Home Page Card (`components/home-page.tsx`)**:
   - When in-progress:
     - Render a `.home-course-progress` block above the footer meta:
       - Progress track with `${progress.percentage}%` width.
       - Percentage label `${progress.percentage}% complete`.
       - Compact "Resume →" link to `resumeHref`.
   - When completed:
     - Render progress track at 100% with a "Completed" badge.
   - When unstarted or signed out:
     - Display exactly as today, preserving the clean reference look from `design/lopsis-home.png`.

5. **Homepage Keyboard Shortcut (`⌘ K` / `Ctrl+K`)**:
   - In `components/home-page.tsx`, create an input ref `const searchInputRef = useRef<HTMLInputElement>(null);`.
   - Attach a `keydown` event listener on `window` in a `useEffect`:
     - When `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'`, prevent default, focus the input, select existing text, and log `search_shortcut_used` to PostHog.
   - Also allow clicking the `<kbd>⌘ K</kbd>` element directly to focus the input.

6. **Styling and Design System Fidelity**:
   - Add targeted CSS in `app/globals.css` using existing CSS variables, borders (`#e9ddd6`, `#eadfd8`), brand orange (`#e9532d`, `#f05223`), and neutral fonts (`Inter`, `Playfair Display`).
   - Ensure responsive layout behaves cleanly across mobile, tablet, and desktop breakpoints.

---

## Files to touch

1. `components/all-courses-page.tsx`:
   - Wire `CourseCard` to `useLearnerProgress`.
   - Link instructor bylines to `/instructors/[slug]`.
   - Add progress bar, completion stats, and resume CTA.
   - Track analytics for instructor and resume clicks.
2. `components/home-page.tsx`:
   - Wire `CourseCard` to `useLearnerProgress`.
   - Add progress indicator and resume link for enrolled courses.
   - Implement `⌘ K` / `Ctrl+K` keyboard shortcut and search input focus ref.
   - Track analytics for resume clicks and shortcut activation.
3. `app/globals.css`:
   - Add styles for `.catalog-card-instructor`, `.catalog-card-progress`, `.catalog-card-progress-track`, `.catalog-card-progress-labels`, `.catalog-card-resume-action`, `.home-course-progress`, `.home-course-progress-header`, `.home-course-resume-btn`, `.home-course-completed-badge`.
4. `lib/progress/progress.test.ts`:
   - Add unit tests verifying card progress computation, resume URL generation with/without timestamp, and instructor slug URL resolution.
5. `AGENTS.md`:
   - Update Section 15 Task 3 prompt reference.

---

## Detailed requirements

### 1. Catalog Page (`components/all-courses-page.tsx`)
- Import `useLearnerProgress` from `@/lib/progress/use-learner-progress`.
- In `CourseCard`:
  - Extract `getCourseProgress` and `isSignedIn`.
  - Calculate progress using `course.lessonCount`.
  - Determine `hasProgress = Boolean(isSignedIn && (progress.completedCount > 0 || progress.lastLessonSlug || progress.lastLessonId))`.
  - Derive `resumeHref`:
    - If `progress.lastLessonSlug`: `/lessons/${progress.lastLessonSlug}` + (`?start=${Math.floor(progress.lastPositionSeconds)}` if `> 0`).
    - Fallback: `/courses/${course.slug}`.
  - In `.catalog-card-context`:
    - When `course.instructor?.slug` is defined, wrap `By {course.instructor.name}` in `<Link href={`/instructors/${course.instructor.slug}`}>`.
  - In `.catalog-card-body`:
    - Insert progress bar if `hasProgress`.
  - In `.catalog-card-footer`:
    - If `hasProgress && !progress.isCompleted`, provide `Resume <ArrowRight />` linking to `resumeHref` and `Details` linking to `/courses/${course.slug}`.
    - If `hasProgress && progress.isCompleted`, provide `Review course <ArrowRight />`.
    - Otherwise, preserve `View course <ArrowRight />`.

### 2. Homepage (`components/home-page.tsx`)
- Import `useLearnerProgress` from `@/lib/progress/use-learner-progress`.
- In `CourseCard`:
  - Read `getCourseProgress` and `isSignedIn`.
  - Compute `hasProgress` and `resumeHref`.
  - When `hasProgress`, display `.home-course-progress` above `.home-course-meta`.
- In `HomePage`:
  - Add `searchInputRef` to `#learning-search`.
  - Add `useEffect` listening for `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'`.
  - Prevent default browser shortcut, call `searchInputRef.current?.focus()` and `searchInputRef.current?.select()`.
  - Capture PostHog `search_shortcut_used` event.
  - Make `<kbd>⌘ K</kbd>` clickable to focus the input.

### 3. Styling (`app/globals.css`)
- Style `.catalog-card-instructor` with hover underline and color transition to brand orange (`#e9532d`).
- Style `.catalog-card-progress` and `.catalog-card-progress-track` with 5px height, border-radius 99px, brand orange fill gradient, and smooth width transition.
- Style `.catalog-card-resume-action` with primary accent button/link styling.
- Style `.home-course-progress`, `.home-course-resume-btn`, and badges to fit neatly within the home card layout.

### 4. Unit Testing (`lib/progress/progress.test.ts`)
- Test `getResumeHref(courseSlug, lastLessonSlug, lastPositionSeconds)` helper logic:
  - Generates lesson link with timestamp when `lastPositionSeconds > 0`.
  - Generates lesson link without query when `lastPositionSeconds` is 0 or undefined.
  - Falls back to course slug when `lastLessonSlug` is null or empty.
- Test card progress state determination:
  - Distinguishes unstarted, in-progress, and completed states.

---

## Security and architectural boundaries

- All progress state remains read-only from the client components via `useLearnerProgress`.
- No sensitive tokens or secrets are exposed to the client.
- Links to `/instructors/[slug]` and `/lessons/[slug]` use safe relative routes.
- Keyboard event listener is cleaned up properly on unmount to prevent memory leaks.

---

## Acceptance criteria

1. **Course Catalog (`/courses`)**:
   - Signed-out users see clean cards with "View course" and clickable instructor links (`/instructors/[slug]`).
   - Signed-in users with progress see a progress bar (`X% complete`, `Y of Z lessons`), a direct "Resume" link to their last lesson and timestamp, and an "Overview" link.
   - 100% completed courses display completed badge/text and "Review course".
   - Instructor link triggers `catalog_instructor_clicked` telemetry.
2. **Homepage (`/`)**:
   - Pressing `⌘ K` (macOS) or `Ctrl+K` (Windows/Linux) immediately focuses the homepage search input.
   - Clicking `<kbd>⌘ K</kbd>` focuses the search input.
   - Featured course cards display progress bar and "Resume →" affordance for enrolled courses.
   - Unstarted cards remain identical to `design/lopsis-home.png`.
3. **Tests & Quality**:
   - `npm run test:unit` passes with all tests green.
   - `npx tsc --noEmit` passes with 0 type errors.
   - `npm run lint` passes with 0 lint warnings or errors.
   - `npm run build` succeeds cleanly.

---

## Checks to run

```bash
# 1. Run unit test suite
npm run test:unit

# 2. Run TypeScript compiler check
npx tsc --noEmit

# 3. Run ESLint check
npm run lint

# 4. Production Webpack build
npm run build
```

---

## Exact manual test steps

1. Open Homepage (`http://localhost:3000`):
   - Press `Cmd+K` / `Ctrl+K` and verify the search input receives focus and cursor.
   - Type a query and verify standard search continues to work.
   - View the 3 featured course cards in signed-out state: verify pristine layout matching design.
2. Sign in with a test user:
   - Navigate to `/courses`:
     - Hover over `By [Instructor Name]` on any card: verify cursor changes, text turns orange/underlined, and clicking navigates to `/instructors/[slug]`.
     - Complete or start a lesson in a course: return to `/courses` and verify the card renders the progress bar, percentage, and "Resume" button.
     - Click "Resume" on an in-progress card: verify it navigates directly to `/lessons/[slug]?start=[seconds]` at the exact timestamp.
   - Return to Homepage (`/`):
     - Verify the in-progress course displays the progress bar and "Resume →" affordance.
     - Click "Resume →" and confirm navigation to the lesson.
