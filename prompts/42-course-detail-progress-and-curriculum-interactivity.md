# Implement Course Detail Page Progress, Resume & Curriculum Interactivity

## Goal

Connect the Course Detail Page (`/courses/[slug]`) to real learner progress and client interactivity: wire `CoursePage` and `CourseCurriculum` to `useLearnerProgress`, render real learner completion percentages and animated progress track in the fixed bottom strip, dynamically route the hero and bottom strip CTAs to the learner's active resume lesson, add status indicators (completed checkmark, in-progress indicator, free preview badge) to curriculum lesson rows, add instructor attribution in the Course Hero linking to `/instructors/[slug]`, and implement an interactive Course Bookmark button with active styling and local state persistence.

## Guidance read and code inspected

- `AGENTS.md`:
  - Section 1: Product name is Lopsis.
  - Section 3: UI fidelity, reproduction of desktop reference `design/lopsis-course.png`, responsive down to mobile.
  - Section 7: Progress is tracked per learner (completed lessons, resume position). Surface it as completion marks and a resume affordance on catalog, course, and lesson pages. Free preview is a label, not access control. Some surfaces are presentational only (Notes tab, free preview badge, bookmarks).
  - Section 8: Surface the instructor on the course and lesson, and give each instructor their own page (`/instructors/[slug]`).
  - Section 12: Architecture boundaries (browser never writes progress directly, tokens server-only).
  - Section 13: Checks to run (typecheck, lint, build).
  - Section 15: Task 2 specification:
    - Wire `CoursePage` to `useLearnerProgress`.
    - Render actual completion percentage and filled progress track in the fixed bottom strip.
    - Route hero "Continue Learning" and bottom strip CTA to the learner's current resume lesson or next uncompleted lesson, adapting label ("Start Course" vs "Continue Learning" vs "Review Course").
    - Update `CourseCurriculum` lesson rows with completed checkmark, in-progress dot (`<i className="status-progress"/>`), and "Free preview" badge tag.
    - Implement interactive Course Bookmark button with active toggle styling, tooltip/toast feedback, and local/user state persistence.
    - Add instructor attribution in Course Hero with photo, name linking to `/instructors/[slug]`, and expertise.
- Visual reference inspected:
  - `design/lopsis-course.png` at 1024 × 1536 desktop resolution showing:
    - Course hero with cover, popular badge, title, summary, meta stats, primary action CTA, and bookmark button.
    - Learning outcomes grid (2x2).
    - Course content curriculum list with modules, duration, and expandable lessons.
    - Fixed bottom progress strip with "Your Progress", "35% complete", progress track, and CTA button.
  - `design/lopsis-designsystem.png` and `components/design-system-page.tsx`:
    - Status indicators: In Progress (`<i className="status-progress"/>`), Completed (`Icon name="check"`), Now Playing, Locked.
    - Badges: Video, Lesson, Popular.
- Inspected existing codebase files:
  - `components/course-page.tsx`: Current course page layout, static 0% progress strip, static first-lesson CTA, presentational bookmark button, lack of instructor attribution.
  - `components/course-curriculum.tsx`: Module accordion, lesson list rendering, lack of progress and preview badges.
  - `sanity/queries/courses.ts` & `sanity/queries/fragments.ts`: Confirmed `COURSE_BY_SLUG_QUERY` already projects `instructor` (`_id`, `name`, `slug`, `expertise`, `photo`) and lesson `freePreview`, `durationSeconds`, `studentCount`.
  - `sanity.types.ts`: Confirmed TypeScript types for `COURSE_BY_SLUG_QUERY_RESULT`.
  - `lib/progress/types.ts` & `lib/progress/use-learner-progress.ts`: API contracts (`getCourseProgress`, `isLessonCompleted`, `recordResume`).
  - `app/globals.css`: Styles for `.course-progress-strip`, `.course-progress-track`, `.course-bookmark`, `.status-progress`, `.badge`.

## Decisions and assumptions

1. **Learner Progress Integration in `CoursePage`**:
   - Call `const { getCourseProgress, isLessonCompleted, recordResume } = useLearnerProgress();`.
   - Calculate total lessons: `const allLessons = modules.flatMap((m) => m.lessons); const totalLessons = allLessons.length;`.
   - Obtain course progress: `const progress = getCourseProgress(course._id, totalLessons);`.
   - Completion percentage: `progress.percentage` (0 to 100).
   - If signed out or no progress: gracefully defaults to 0% with empty track and "Start Course" CTA.
2. **Dynamic CTA Link & Label Resolution**:
   - Resume target lesson resolution logic:
     1. If `progress.lastLessonSlug` / `progress.lastLessonId` exists in `allLessons`:
        - If that lesson is not completed, select it as `targetLesson`.
        - If that lesson was completed, find the first subsequent incomplete lesson in curriculum order.
     2. If no last lesson is stored: find the first incomplete lesson in curriculum order.
     3. If all lessons are completed: select the first lesson (`allLessons[0]`) for review.
     4. If no lessons exist: fallback to `#course-content`.
   - Dynamic CTA Label:
     - If `progress.completedCount === 0 && !progress.lastLessonId`: `"Start Course"`
     - If `progress.isCompleted`: `"Review Course"`
     - Else: `"Continue Learning"`
   - Dynamic Target URL:
     - If resuming a lesson that has `progress.lastPositionSeconds && progress.lastPositionSeconds > 0 && targetLesson.id === progress.lastLessonId`:
       `/lessons/${targetLesson.slug}?start=${Math.floor(progress.lastPositionSeconds)}`
     - Otherwise:
       `/lessons/${targetLesson.slug}`
   - Action click handler:
     - When resuming with a saved timestamp, trigger `recordResume(course._id, targetLesson.id, progress.lastPositionSeconds)`.
     - Fire PostHog event `course_started` with properties:
       `{ course_id: course._id, course_slug: course.slug, lesson_id: targetLesson?.id, lesson_slug: targetLesson?.slug, source, is_resume: Boolean(progress.lastLessonId) }`.
3. **Fixed Bottom Progress Strip**:
   - Update copy to render actual learner percentage: `<strong>{progress.percentage}% <em>complete</em></strong>`.
   - Update progress track: `<span style={{ width: `${progress.percentage}%` }} />`.
   - Accessibility: set `aria-valuenow={progress.percentage}` on `role="progressbar"`.
   - Update CTA link and label to match the dynamic resume lesson and state.
4. **Curriculum Lesson Rows Status Indicators (`CourseCurriculum`)**:
   - Update `CurriculumModule` lesson interface to include `freePreview?: boolean`.
   - Map `freePreview: Boolean(lesson.freePreview)` in `getCurriculum(course)` in `components/course-page.tsx`.
   - Pass `courseId={course._id}` and `activeResumeLessonId={targetLesson?.id}` into `CourseCurriculum`.
   - For each lesson row:
     - **Completed State**: If `isLessonCompleted(courseId, lesson.id)`, render a green checkmark icon (`course-lesson-check`) next to the lesson number.
     - **In-Progress State**: If `lesson.id === activeResumeLessonId && !isCompleted`, render `<i className="status-progress" title="In progress" aria-label="In progress" />` next to the lesson number.
     - **Free Preview Badge**: If `lesson.freePreview`, render `<span className="course-lesson-preview">Free preview</span>` alongside the lesson title.
5. **Instructor Attribution in Course Hero**:
   - `course.instructor` is already available from GROQ query.
   - Render instructor attribution directly below `course.summary` and above `.course-meta`:
     - Circular photo (40x40) using `urlFor(course.instructor.photo)` with crop and blur placeholder (falling back to initial avatar if absent).
     - Label "Taught by" and instructor name linked to `/instructors/${course.instructor.slug}`.
     - Expertise badge/tag (`course.instructor.expertise`) when available.
6. **Course Bookmark Interactivity & Persistence (`useBookmarks`)**:
   - Build a reusable client hook `lib/bookmarks/use-bookmarks.ts` with local storage persistence under `'lopsis:bookmarks'`.
   - Supports bookmarking both courses and lessons (`{ id, type: 'course' | 'lesson', title, slug, bookmarkedAt }`).
   - Dispatches custom `window` storage events so multiple components / tabs stay synchronized in real time.
   - In `CoursePage`:
     - Toggle bookmark state on click.
     - Add `.is-bookmarked` class with filled bookmark SVG icon and active accent styling.
     - Toggle text and accessible label: "Bookmark" (`aria-label="Bookmark {course.title}"`) vs "Bookmarked" (`aria-label="Remove bookmark for {course.title}"`, `aria-pressed={true}`).
     - Display transient toast/tooltip ("Added to bookmarks" / "Removed from bookmarks") that auto-dismisses after 2.5 seconds.
7. **Styling & Responsive Layout**:
   - Maintain the warm paper aesthetic, 1px borders, and Playfair Display typography.
   - Add styles in `app/globals.css` for instructor attribution, curriculum status indicators, free preview badge, bookmark active states, and toast notifications.
   - Ensure responsive reflow at 900px, 700px, 430px, and 375px without layout breaking or horizontal overflow.

## Files expected to touch

- `lib/bookmarks/types.ts`: Bookmark data types.
- `lib/bookmarks/use-bookmarks.ts`: React hook for querying and toggling bookmarks in `localStorage` with cross-tab sync.
- `components/course-page.tsx`: Integrate `useLearnerProgress`, dynamic CTA logic, bottom strip progress, instructor attribution, and bookmark toggle.
- `components/course-curriculum.tsx`: Integrate progress status checkmarks, in-progress dot, and free preview badge on lesson rows.
- `app/globals.css`: Styles for instructor attribution, curriculum status indicators, free preview badge, bookmark active states, and toast feedback.
- `lib/bookmarks/bookmarks.test.ts`: Unit tests verifying bookmark serialization and resolution logic.

## Requirements

1. **Truthful Progress Display**:
   - If learner has not completed any lessons, display `0% complete` with 0 width track and "Start Course" CTA.
   - If learner has completed lessons, compute integer percentage: `Math.min(100, Math.round((completedCount / total) * 100))`.
   - Update both copy and visual progress bar width in the bottom fixed strip.
2. **Smart Resume Routing**:
   - Resumes the exact lesson where the learner left off.
   - If the learner left off with a timestamp > 0, deep link with `?start=${Math.floor(lastPositionSeconds)}`.
   - If all lessons are completed, display "Review Course" and route to the first lesson.
3. **Curriculum Status Badges**:
   - Completed lessons must display a checkmark.
   - Active resume lesson must display the in-progress spinner dot (`status-progress`).
   - Free preview lessons must display "Free preview" badge tag.
4. **Instructor Attribution**:
   - Surface instructor photo, name, and expertise on the course hero.
   - Name and photo must link to `/instructors/[slug]`.
5. **Course Bookmarking**:
   - Interactive toggle button that updates UI immediately and persists to browser storage.
   - Provides accessible `aria-pressed` and `aria-label` feedback.
6. **No Regressions**:
   - Unauthenticated visitors must see normal zero-state progress and functional "Start Course" links without any errors.
   - Existing unit tests (`npm run test:unit`), TypeScript check (`npx tsc --noEmit`), and lint (`npm run lint`) must pass.

## Security and privacy considerations

- No tokens or private Sanity credentials exposed to the client.
- Progress reads rely on `LearnerProgressProvider` which communicates with the authenticated `/api/progress` route.
- Bookmarks are stored on the client in `localStorage`. No sensitive or PII data stored.
- Free preview badge remains a presentational label only, adhering strictly to AGENTS.md Section 7.

## Acceptance criteria

- Course detail page at `/courses/[slug]` displays real learner progress percentage and animated track fill when signed in.
- Fixed bottom progress strip matches `design/lopsis-course.png` layout and updates dynamically based on user progress.
- Hero CTA and bottom strip CTA dynamically render "Start Course", "Continue Learning", or "Review Course" and route to the correct resume lesson.
- In-progress lesson shows `<i className="status-progress"/>` dot in the curriculum list.
- Completed lessons show checkmarks in the curriculum list.
- Free preview lessons show the "Free preview" badge pill.
- Instructor attribution card/section is rendered in Course Hero with photo, name linking to `/instructors/[slug]`, and expertise.
- Bookmark button toggles between unbookmarked and bookmarked states with filled icon, active style, and persistent local storage.
- Clicking the bookmark button shows accessible transient feedback.
- TypeScript check (`npx tsc --noEmit`), lint (`npm run lint`), and unit tests (`npm run test:unit`) pass with 0 errors.

## Checks to run

1. `npx tsc --noEmit` — root workspace TypeScript compilation.
2. `npm run lint` — ESLint validation.
3. `npm run test:unit` — verify existing and new unit tests pass.
4. `npm run build` — Next.js production build verification.

## Exact manual test steps

1. Navigate to `/courses/nextjs-app-router-in-depth` while signed out:
   - Verify bottom strip displays `0% complete` with an empty track.
   - Verify hero and bottom strip CTAs show "Start Course" linking to the first lesson.
   - Verify curriculum modules can be expanded and show derived lesson durations and "Free preview" badge on eligible lessons.
   - Verify instructor photo, name (linking to `/instructors/sarah-chen`), and expertise ("Senior Next.js Architect") appear in the hero.
2. Click the "Bookmark" button:
   - Verify button switches to active bookmarked state with filled icon and "Bookmarked" text.
   - Refresh the page and verify bookmark state is preserved.
   - Click again to unbookmark and verify state reverts.
3. Sign in as a learner with progress (or simulate completed lessons via `/api/progress`):
   - Verify bottom strip displays the actual completion percentage (e.g. `33% complete` or `50% complete`) and the progress bar is filled accordingly.
   - Verify hero and bottom strip CTAs display "Continue Learning" and route to the active incomplete lesson.
   - Expand the curriculum module: verify completed lessons have a checkmark icon, and the active lesson has an in-progress dot.
4. Mark all lessons completed:
   - Verify bottom strip displays `100% complete` with full track.
   - Verify CTA displays "Review Course".
