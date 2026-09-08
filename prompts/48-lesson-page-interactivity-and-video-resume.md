# Implement Lesson Page Interactivity, Completion Toggle & Video Resume Persistence

## Goal

Connect the Lesson Page (`/lessons/[slug]`, `components/lesson-page.tsx`, `components/lesson-video.tsx`) to learner progress, bookmarks, instructor attribution, and intelligent video playback:
1. Wire `LessonPage` to `useLearnerProgress` to reflect actual course progress in the left rail summary (`X% complete` and filled progress bar).
2. Render learner progress in the curriculum rail: checkmarks for completed modules and lessons, active "Now playing" indicators with the play affordance for the current lesson, and free preview badges.
3. Add an interactive "Mark as Complete" / "Completed" toggle button in the lesson header with loading state, accessible feedback, optimistic updates, and PostHog analytics.
4. Wire the Lesson Bookmark button to `useBookmarks` with active state styling, filled icon, accessible ARIA attributes, transient toast feedback, and cross-tab synchronization.
5. Surface instructor attribution in the lesson header (avatar, name linking to `/instructors/[slug]`, and expertise) per Section 8 of `AGENTS.md`.
6. Update `LessonVideo` to:
   - Automatically seek to the learner's saved resume position when no URL `start` parameter is provided.
   - Persist playback progress (`lastPositionSeconds`) to the progress API on pause, periodic playback intervals, and component unmount.
   - Automatically mark the lesson as completed when the video finishes (`videoCompleted` event).
7. Ensure strict fidelity to `design/lopsis-lesson.png`, responsive behavior, and robust error handling.

---

## Guidance read and code inspected

- `AGENTS.md`:
  - **Section 1**: Product name is Lopsis.
  - **Section 3**: UI fidelity. Reproduce reference designs (`design/lopsis-lesson.png`) exactly: layout, typography, colors, and responsive behavior.
  - **Section 5**: Responsibilities and boundaries. Pages display stored data. The browser never writes directly to Sanity; all progress writes go through the authenticated server route (`/api/progress`).
  - **Section 7**: Progress is tracked per learner: which lessons they have completed and where they left off (resume position). Surface completion marks and resume affordances. Free preview is a label, not access control. PostHog captures engagement: catalog and lesson views, video play, watch depth, and lesson completion.
  - **Section 8**: Surface instructor on course and lesson, linking to `/instructors/[slug]`.
  - **Section 9 & 11**: Provider embeds for YouTube, Vimeo, and Bunny on the lesson page.
  - **Section 13**: Checks to run (`npm run test:unit`, `npx tsc --noEmit`, `npm run lint`, `npm run build`).
  - **Section 15**: Task 4 specification:
    - Wire `LessonPage` to `useLearnerProgress`.
    - Connect rail course progress bar to real learner progress percentage.
    - Render completed checkmarks and in-progress status in rail lesson items.
    - Add "Mark as Complete" / "Completed" toggle button in lesson header with loading and success states.
    - Implement interactive Lesson Bookmark button with active toggle and state persistence.
    - Surface instructor attribution in lesson header with link to `/instructors/[slug]`.
    - Update `LessonVideo` to seek to saved resume position, auto-save resume timestamp on pause/interval, and auto-complete on video end.

- Inspected Codebase Files:
  - `components/lesson-page.tsx`: Lesson layout, rail course summary (`0% complete` hardcoded), rail modules and lessons list, lesson header with static bookmark button, tabs, overview, key points, pro tip, resources, and pagination.
  - `components/lesson-video.tsx`: Embed player for YouTube, Vimeo, and Bunny with `startSeconds` prop, watch depth milestones, PostHog analytics, and cleanup logic.
  - `sanity/queries/lessons.ts` & `sanity/data/lessons.ts`: `LESSON_BY_SLUG_QUERY` already queries `course.instructor->{ _id, name, "slug": slug.current, expertise, photo { ... } }` and module lesson details (`freePreview`, `durationSeconds`).
  - `lib/progress/types.ts` & `lib/progress/progress-provider.tsx`: Provides `getCourseProgress`, `isLessonCompleted`, `toggleComplete`, `savePosition`, `recordResume`, and `isSignedIn`.
  - `lib/bookmarks/use-bookmarks.ts`: Persists course and lesson bookmarks using `localStorage` and `useSyncExternalStore`.
  - `design/lopsis-lesson.png`: Visual source of truth for the rail progress, module completion icons, active playing lesson, lesson header, bookmark icon, and lesson details.

---

## Decisions and assumptions

1. **Course Progress in Rail**:
   - In `LessonPage`, call `getCourseProgress(course._id, flatLessons.length)`.
   - Update the rail summary:
     - Replace hardcoded `0% complete` with `${progress.percentage}% complete`.
     - Update progress bar track `<i><b style={{ width: `${progress.percentage}%` }} /></i>` with accessible progressbar ARIA attributes.
   - For each module in the rail:
     - Determine if all lessons in that module are completed (`moduleLessons.length > 0 && moduleLessons.every(l => isLessonCompleted(course._id, l._id))`).
     - If completed, render an orange checkmark circle icon on the right (matching `design/lopsis-lesson.png` modules 1–4).
   - In the expanded module's lesson list:
     - If lesson is completed (`isLessonCompleted(course._id, item._id)`), render completed checkmark indicator.
     - If lesson is current playing (`item._id === lesson._id`), render active indicator: solid orange dot, "Now playing" orange text, and right play icon circle matching reference image.

2. **"Mark as Complete" / "Completed" Header Button**:
   - Add an action button in `.lesson-header > div` next to the Bookmark button:
     - When not completed: `<button className="lesson-complete-btn" ...><CheckIcon /> Mark complete</button>`.
     - When completed: `<button className="lesson-complete-btn is-completed" ...><CheckIcon filled /> Completed</button>`.
   - Accessible attributes: `aria-pressed`, `aria-label`, disabled when unauthenticated or during mutation (`isMutating`).
   - On click: calls `toggleComplete(course._id, lesson._id)`.
   - Captures PostHog analytics event `lesson_completed` or `lesson_marked_incomplete`.

3. **Lesson Bookmark Interactivity**:
   - Wire the bookmark button to `useBookmarks()`:
     - `const isCurrentBookmarked = isBookmarked(lesson._id);`
     - On click: `toggleBookmark({ id: lesson._id, type: 'lesson', title: lesson.title, slug: lesson.slug })`.
     - Display transient toast notification ("Added to bookmarks" / "Removed from bookmarks") matching `CoursePage`.
     - Toggle active styling `.is-bookmarked` and filled SVG icon `<Bookmark filled={isCurrentBookmarked} />`.

4. **Instructor Attribution in Lesson Header**:
   - When `lesson.course?.instructor` is available, render an instructor attribution card/line in the lesson header:
     - Instructor avatar (photo formatted with Sanity URL builder or initial fallback).
     - "Taught by" label and instructor name linking to `/instructors/${course.instructor.slug}`.
     - Expertise tags/text.
     - Stop propagation on link and track PostHog event `lesson_instructor_clicked`.

5. **Video Resume and Auto-Completion in `LessonVideo`**:
   - **Initial Seek**:
     - `startSeconds` is parsed from query param `?start=X`. If `startSeconds > 0`, use it directly.
     - If `startSeconds === 0`, check if user has saved progress for this course and lesson (`progress.lastLessonId === lessonId && (progress.lastPositionSeconds ?? 0) > 0`).
     - If so, use `effectiveStartSeconds = Math.floor(progress.lastPositionSeconds)` and trigger `recordResume`.
   - **Position Persistence**:
     - Periodically (e.g. every 15 seconds during playback) and on `pause` / window `beforeunload` / unmount:
       If current playback position > 5 seconds and not already completed:
       Call `savePosition(courseId, lessonId, currentPosition)`.
     - Debounce/throttle saves to avoid excessive network requests.
   - **Auto-Completion**:
     - When video playback completes (`recordCompleted` / `videoCompleted` event):
       If user is signed in and lesson is not already marked completed, automatically invoke `toggleComplete(courseId, lessonId, true, 'video_ended')`.

---

## Files to touch

1. `components/lesson-page.tsx`:
   - Connect to `useLearnerProgress()` and `useBookmarks()`.
   - Render dynamic rail course progress (`% complete` and bar fill).
   - Render rail module and lesson completion indicators (checkmarks, "Now playing" play icon).
   - Add "Mark complete" / "Completed" interactive button.
   - Add interactive bookmark button with toast notifications.
   - Add instructor attribution section with link to `/instructors/[slug]`.
   - Pass progress resume context to `LessonVideo`.
2. `components/lesson-video.tsx`:
   - Accept optional saved resume position or integrate `useLearnerProgress`.
   - Seek to saved resume position on start when no URL start query is given.
   - Save playback position on pause and periodically during playback.
   - Auto-mark lesson completed on `videoCompleted` event.
3. `app/globals.css`:
   - Add CSS for:
     - `.lesson-complete-btn` (uncompleted, completed, hover, and loading states).
     - `.lesson-header button.is-bookmarked` and filled bookmark styling.
     - `.lesson-instructor` attribution block in lesson header.
     - `.lesson-rail-module-check` (completed module badge in rail).
     - `.lesson-rail-lesson-check` and `.lesson-rail-play-icon` (completed check and play icon in rail lessons).
     - `.lesson-toast` notification alert.
4. `lib/progress/progress.test.ts`:
   - Add unit test coverage for lesson resume resolution, module completion checks, and video auto-completion triggers.
5. `AGENTS.md`:
   - Update Section 15 Task 4 prompt reference to `prompts/48-lesson-page-interactivity-and-video-resume.md`.

---

## Detailed requirements

### 1. Curriculum Rail (`components/lesson-page.tsx`)
- Compute `progress = course ? getCourseProgress(course._id, flatLessons.length) : null;`.
- Update `.lesson-course-summary`:
  - Display `<span>{progress ? `${progress.percentage}% complete` : '0% complete'}</span>`.
  - Update `<i><b style={{ width: `${progress ? progress.percentage : 0}%` }} /></i>`.
- For each module in the rail:
  - Check if every valid lesson in `module.lessons` is completed via `isLessonCompleted(course._id, item._id)`.
  - When all lessons are completed, render a completed check icon `<CheckIcon />` on the module row.
- For each lesson in the expanded module list:
  - If `isLessonCompleted(course._id, item._id)`: render completed check icon `<CheckIcon />`.
  - If `item._id === lesson._id`: render `Now playing` subtitle and play circle icon `<PlayCircleIcon />` on the right.

### 2. Lesson Header & Actions (`components/lesson-page.tsx`)
- Inside `.lesson-header`:
  - Title row:
    - Render `<h1>{lesson.title}</h1>`.
    - Group action buttons:
      - **"Mark Complete" Button**:
        - Toggle lesson completion via `toggleComplete(course._id, lesson._id)`.
        - Visual states:
          - Incomplete: border with check icon and label "Mark complete".
          - Completed: filled background with check icon and label "Completed".
        - Accessible ARIA attributes (`aria-pressed`, `aria-label`, disabled state during pending request).
      - **Bookmark Button**:
        - Toggle bookmark via `useBookmarks()`.
        - Visual states: outline when unsaved, solid orange with filled bookmark icon when saved.
        - Toast notification: transient feedback popup ("Added to bookmarks" / "Removed from bookmarks").
  - Instructor Attribution:
    - Render when `course?.instructor` exists:
      - Avatar image (or initials fallback).
      - "Taught by" label.
      - Link to `/instructors/${course.instructor.slug}`.
      - Expertise list.

### 3. Video Playback & Resume (`components/lesson-video.tsx`)
- When initializing player:
  - If `startSeconds === 0` and learner has a saved position `lastPositionSeconds > 0` for this lesson:
    - Seek to `lastPositionSeconds`.
    - Record resume via `recordResume(courseId, lessonId, lastPositionSeconds)`.
- During playback:
  - Persist current timestamp (`savePosition`) on:
    - Video pause event (YouTube state 2, Vimeo 'pause', Bunny 'pause').
    - Throttle periodic updates (every 15 seconds during continuous playback).
- On video completion:
  - When video ends (YouTube state 0, Vimeo 'ended', Bunny 'ended'):
    - Automatically call `toggleComplete(courseId, lessonId, true, 'video_ended')`.

### 4. Styling & Mobile Responsiveness (`app/globals.css`)
- Style all new elements to match `design/lopsis-lesson.png`:
  - Accent colors `#d64c28` / `#e9532d` for active states and checkmarks.
  - Neutral warm borders `#ecd8ce` / `#eee3dd`.
  - Smooth hover transitions and focus rings for accessibility.
  - Clean responsive stacking on screens `<= 760px`.

---

## Security and architectural boundaries

- Server routes handle all datastore mutations (`/api/progress`); browser never writes directly to Sanity.
- Client state uses optimistic updates with rollback on network failure.
- Video position auto-save throttles calls to prevent network flooding.
- Event listeners are cleanly unmounted to prevent memory leaks.

---

## Acceptance criteria

1. **Rail Progress**:
   - Rail displays real learner completion percentage and progress bar fill.
   - Completed modules show checkmark badges.
   - Completed lessons show checkmarks; active lesson shows "Now playing" and play icon.
2. **Interactive Controls**:
   - "Mark complete" button toggles completion, updates rail progress immediately, and persists to the backend.
   - Bookmark button toggles bookmark state, updates icon fill, and shows confirmation toast.
   - Instructor attribution links to `/instructors/[slug]`.
3. **Video Resume & Auto-Complete**:
   - Returning to a partially watched lesson without `?start` resumes from the saved timestamp.
   - Pausing the video saves the current timestamp to progress.
   - Finishing the video automatically marks the lesson complete.
4. **Checks & Quality**:
   - `npm run test:unit` passes with all tests green.
   - `npx tsc --noEmit` passes with 0 type errors.
   - `npm run lint` passes with 0 errors or warnings.
   - `npm run build` succeeds cleanly.

---

## Checks to run

```bash
# 1. Run unit test suite
npm run test:unit

# 2. Run TypeScript type check
npx tsc --noEmit

# 3. Run ESLint
npm run lint

# 4. Run Next.js production build
npm run build
```

---

## Exact manual test steps

1. Navigate to `/lessons/[slug]` in signed-in state:
   - Verify rail shows real course completion percentage and progress bar.
   - Verify completed modules and lessons in the rail show checkmarks.
   - Verify current lesson shows "Now playing" and the play icon.
2. Click "Mark complete" in lesson header:
   - Verify button switches to "Completed" with filled checkmark.
   - Verify rail progress percentage increases immediately.
   - Click "Completed" again: verify it reverts to "Mark complete" and progress decreases.
3. Click "Bookmark":
   - Verify bookmark icon fills, toast alert appears ("Added to bookmarks"), and state persists on refresh.
4. Video playback & resume:
   - Play video to 30 seconds and pause. Refresh page without `?start` parameter.
   - Verify player resumes from 30 seconds.
   - Fast-forward to the end of the video and let it complete.
   - Verify lesson is automatically marked as completed in header and rail.
