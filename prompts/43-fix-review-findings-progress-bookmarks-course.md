# Fix verified review findings for progress API, bookmarks concurrency, and course page resume state

## Goal

Resolve verified review findings across progress mutation handling, bookmark storage concurrency, course resume indicators, and learner auth lifecycle with minimal, targeted changes:
1. **`app/api/progress/route.ts`**: Return HTTP 400 for malformed JSON request bodies while preserving Zod validation error handling and 500 status for unexpected server errors.
2. **`app/api/progress/route.ts`**: Implement revision-guarded patch (`ifRevisionId`) with retry logic in `toggle_complete` to prevent race conditions during concurrent completion updates.
3. **`components/course-page.tsx`**: Pass `activeResumeLessonId` to `CourseCurriculum` only when resume progress identifies an actually resumed (and uncompleted) lesson; do not fall back to `targetLesson`.
4. **`lib/bookmarks/use-bookmarks.ts`**: Use a safe localStorage read helper falling back to the current bookmark snapshot on read failure or permission denial.
5. **`lib/bookmarks/use-bookmarks.ts`**: Coordinate cross-tab bookmark mutations using storage-level serialization to prevent concurrent tab updates from overwriting each other while preserving synchronous hook return values.
6. **`lib/progress/progress-provider.tsx`**: Replace full-state rollback with scoped per-course reconciliation and revision counters to protect concurrent mutations from stale rollbacks, and handle non-OK `savePosition` responses as failures.
7. **`lib/progress/progress-provider.tsx`**: Clear records immediately upon sign-out and prior to fetching new records when `userId` changes, preventing cross-user data leakage.

## Skills and documentation read

- Repository `AGENTS.md`, specifically Section 2 (working loop), Section 5 (responsibilities and boundaries), Section 7 (progress tracking per learner), Section 8 (data shapes and progress records), and Section 13 (checks to run).
- Sanity Client documentation regarding mutation patches and optimistic concurrency control (`patch(id).ifRevisionId(rev)`).
- Web Storage API specifications regarding `localStorage` exceptions (`SecurityError`, `QuotaExceededError`) and multi-tab storage synchronization.

## Current code inspected and finding verification

1. **`app/api/progress/route.ts` (Malformed JSON handling)**:
   - *Inspected*: Lines 83-91 call `const rawBody = await request.json()`. If the request body is malformed JSON, `request.json()` throws a `SyntaxError`, which bypasses the `ZodError` check in line 220 and triggers the catch block on line 228, returning a 500 response.
   - *Status*: **Valid**. Wrap `request.json()` in a dedicated try/catch returning a 400 response with `{ error: 'Invalid JSON payload' }`.

2. **`app/api/progress/route.ts` (Revision-guarded `toggle_complete` with retry)**:
   - *Inspected*: Lines 106-162 fetch `completedLessons` without `_rev`, compute `updatedMembers`, and perform an unconstrained `.patch(docId).set(...).commit()`. Concurrent requests for the same user document can clobber each other's lesson completion items.
   - *Status*: **Valid**. Fetch `_rev`, chain `.ifRevisionId(existing._rev)`, and wrap the fetch-patch-commit cycle in a retry loop (up to 3 attempts) so revision conflicts trigger a clean re-fetch and re-application.

3. **`components/course-page.tsx` (`activeResumeLessonId` fallback)**:
   - *Inspected*: Line 402 passes `activeResumeLessonId={targetLesson?.id}`. In lines 186-193, `targetLesson` falls back to the first incomplete lesson (or lesson 1 for unstarted courses). In `CourseCurriculum.tsx` line 96, matching `activeResumeLessonId` adds the `is-in-progress` styling and indicator dot. This incorrectly marks unstarted lessons as in progress.
   - *Status*: **Valid**. Derive `activeResumeLessonId` strictly from `progress.lastLessonId` when it exists in `allLessons` and is not completed. Do not use `targetLesson` as fallback.

4. **`lib/bookmarks/use-bookmarks.ts` (Safe localStorage read & snapshot fallback)**:
   - *Inspected*: Lines 143, 155, and 168 call `window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)` directly inside mutation callbacks without try/catch protection. In environments with disabled or restricted storage, this throws unhandled `SecurityError` or defaults to `[]` instead of preserving the current hook snapshot.
   - *Status*: **Valid**. Introduce a shared `readSafeBookmarks(fallback)` helper catching storage errors and falling back to the current snapshot.

5. **`lib/bookmarks/use-bookmarks.ts` (Cross-tab serialized read-modify-write)**:
   - *Inspected*: Mutations read storage and write back without cross-tab synchronization. If two browser tabs toggle or add bookmarks at the same time, the later tab's write can overwrite the earlier tab's additions.
   - *Status*: **Valid**. Wrap bookmark mutations in a synchronous cross-tab coordination lock mechanism using a short-lived localStorage lock key, ensuring atomic read-modify-write across tabs while preserving synchronous signatures and return values.

6. **`lib/progress/progress-provider.tsx` (Scoped reconciliation & per-course mutation revisions)**:
   - *Inspected*: Line 140 captures `previousRecords = { ...records }` and line 200 restores the entire dictionary `setRecords(previousRecords)` on error. A failure in Course A removes successful or in-flight progress in Course B. Additionally, lines 244-255 ignore non-OK `savePosition` responses without reconciling optimistic position state.
   - *Status*: **Valid**. Use per-course mutation sequence counters (`mutationSeqRef`), scope rollbacks strictly to the affected `courseId` when the sequence matches, and handle `savePosition` non-OK responses as failures that reconcile the optimistic position with the previous state.

7. **`lib/progress/progress-provider.tsx` (Sign-out and user switch state clearance)**:
   - *Inspected*: Lines 58-61 return early if `!isSignedIn` without clearing `records`. On sign-out or when switching user accounts, the previous user's progress records remain in memory and visible until (or if) new data is fetched.
   - *Status*: **Valid**. Clear `records` immediately (`setRecords({})`) upon sign-out or whenever `userId` changes before initiating any new fetch.

## Decisions and assumptions

1. **Retry policy for Sanity patches**: Limit `toggle_complete` retries to 3 attempts with immediate re-fetch. This handles typical concurrent requests without excessive latency.
2. **Synchronous bookmark hook contract**: Keep `toggleBookmark`, `addBookmark`, and `removeBookmark` synchronous to preserve compatibility with existing UI components (like toast triggers in `course-page.tsx`) and unit tests.
3. **Course resume logic**: `targetLesson` remains the single source of truth for navigation links ("Start Course" / "Continue Learning" / "Review Course"), while `activeResumeLessonId` is strictly reserved for highlighting an actively resumed in-progress lesson in the curriculum.

## Files expected to touch

- `app/api/progress/route.ts`
- `components/course-page.tsx`
- `lib/bookmarks/use-bookmarks.ts`
- `lib/bookmarks/bookmarks.test.ts`
- `lib/progress/progress-provider.tsx`
- `prompts/43-fix-review-findings-progress-bookmarks-course.md`

## Requirements

1. **`app/api/progress/route.ts`**:
   - Wrap `request.json()` in a `try...catch` block. On JSON parse failure, respond with HTTP 400 `{ error: 'Invalid JSON payload' }`.
   - In `toggle_complete`, fetch `_rev` along with `completedLessons`.
   - Apply `.patch(docId).ifRevisionId(existing._rev)` to guard the mutation.
   - Wrap the mutation in a retry loop (max 3 attempts). On revision conflict, re-fetch the latest document and recompute `updatedMembers`.
2. **`components/course-page.tsx`**:
   - Compute `activeResumeLessonId`: verify `progress.lastLessonId` exists, is present in `allLessons`, and is NOT completed via `isLessonCompleted(course._id, progress.lastLessonId)`.
   - Pass `activeResumeLessonId={activeResumeLessonId}` to `CourseCurriculum`.
3. **`lib/bookmarks/use-bookmarks.ts`**:
   - Export `readSafeBookmarks(fallback: BookmarkItem[])` using try/catch around `localStorage.getItem`.
   - Implement `runSynchronizedMutation` using a localStorage coordination lock key with timeout and cleanup.
   - Use `runSynchronizedMutation` in `toggleBookmark`, `addBookmark`, and `removeBookmark`.
4. **`lib/progress/progress-provider.tsx`**:
   - In the auth `useEffect`, call `setRecords({})` immediately when `!isSignedIn` or when `userId` changes.
   - Use a `mutationSeqRef` ref to track per-course mutation sequence numbers.
   - In `toggleComplete`, roll back only `courseId` if `mutationSeqRef.current[courseId] === seq`.
   - In `savePosition`, treat `!response.ok` as an error and reconcile `courseId`'s position if `mutationSeqRef.current[courseId] === seq`.
5. **Tests**:
   - Update `lib/bookmarks/bookmarks.test.ts` to test `readSafeBookmarks` fallback and corruption handling.

## Security considerations

- Proper JSON body parsing prevents unhandled exceptions from exposing internal stack traces.
- Clearing progress state on sign-out prevents cross-user information leakage on shared devices.
- Revision checking prevents race conditions from corrupting completion records.

## Acceptance criteria

- Sending malformed JSON to `/api/progress` returns status 400.
- `toggle_complete` uses `ifRevisionId` and retries on conflict.
- Unstarted courses do not display any lesson with the `is-in-progress` indicator.
- Bookmark mutations handle localStorage read restrictions gracefully and coordinate across tabs.
- Failed progress mutations do not clobber progress state of unrelated courses or subsequent mutations.
- Switching users or logging out instantly clears progress state.
- `npm run test:unit`, `npm run lint`, and `npx tsc --noEmit` pass with zero errors.

## Checks to run

- `npm run test:unit`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Manual test steps

1. Send a POST request to `/api/progress` with invalid JSON body (`{bad:`) and verify response is 400 with `{ error: 'Invalid JSON payload' }`.
2. Open a course page that has never been started; verify no lesson in the curriculum has the "In progress" dot.
3. Open a course page where a lesson has been started (has `lastLessonId` and not completed); verify only that specific lesson shows "In progress".
4. Trigger bookmark toggles in two tabs; verify both items are preserved without overwriting.
5. Sign out of Clerk; verify learner progress state clears immediately.
