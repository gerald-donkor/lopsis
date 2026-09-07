# Fix verified review findings for bookmarks storage error handling and learner progress concurrency

## Goal

Resolve still-valid review findings across bookmark storage error handling, learner progress auth-generation isolation, and position-field merging during concurrent progress updates:
1. **`lib/bookmarks/use-bookmarks.ts`**: Update `persistBookmarks` so in-memory cache (`cachedRaw`, `cachedBookmarks`) and `BOOKMARKS_EVENT` dispatch always occur, even when `localStorage.setItem` throws (`QuotaExceededError`, `SecurityError`). Document `runSynchronizedMutation`'s coordination contract explicitly as best-effort synchronous coordination.
2. **`lib/progress/progress-provider.tsx`**: Fence in-flight mutations (`toggleComplete`, `savePosition`, `refresh`) across authentication and identity changes using an auth generation ref (`authGenerationRef`). When identity changes, increment the generation and reset `mutationSeqRef.current = {}`. Require both the captured generation and course mutation sequence to match before committing updates or rollbacks.
3. **`lib/progress/progress-provider.tsx`**: Update `savePosition` so server responses and rollbacks merge only position-owned fields (`lastLessonId`, `lastPositionSeconds`, `lastUpdated`) into the existing `ProgressRecord`, preventing replacement of optimistic or completed lesson IDs set by `toggleComplete`.
4. **`lib/bookmarks/bookmarks.test.ts`**: Add regression tests verifying that a throwing `localStorage.setItem` still updates the in-memory snapshot and dispatches `BOOKMARKS_EVENT`, and that `runSynchronizedMutation` succeeds when storage operations throw.

## Skills and documentation read

- Repository `AGENTS.md`, specifically Section 2 (loop, prompts, and approval), Section 5 (responsibilities and boundaries), Section 7 (progress tracking and bookmarks decisions), Section 8 (data shapes), and Section 13 (checks to run).
- Web Storage API specifications regarding `localStorage` exceptions (`SecurityError`, `QuotaExceededError`) and multi-tab storage synchronization.
- React `useSyncExternalStore` concurrency patterns and optimistic state reconciliation.

## Current code inspected and review findings verification

1. **`lib/bookmarks/use-bookmarks.ts` (Line 71: `localStorage.setItem` throwing stops event dispatch)**:
   - *Inspected*: In `persistBookmarks` (lines 75-88), `localStorage.setItem(BOOKMARKS_STORAGE_KEY, raw)` is wrapped in a try/catch, but `cachedRaw = raw`, `cachedBookmarks = nextBookmarks`, and `window.dispatchEvent(...)` are located inside the same try block *after* `setItem`. If `setItem` throws, the in-memory cache is never updated and subscribers receive no event.
   - *Status*: **Valid**. Move `cachedRaw = raw` and `cachedBookmarks = nextBookmarks` outside the `setItem` try block, and ensure `window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT, ...))` is always called (with its own try/catch).

2. **`lib/progress/progress-provider.tsx` (Lines 38-41: Stale in-flight mutations cross identity boundaries)**:
   - *Inspected*: In lines 34-41, when `prevAuthKey !== currentAuthKey`, `setRecords({})` is called, but `mutationSeqRef.current` is not reset and in-flight asynchronous operations (`toggleComplete`, `savePosition`, `refresh`) have no check for identity changes upon resolution. If user A triggers a mutation and signs out or switches to user B before the server responds, the callback can write user A's progress data into user B's records.
   - *Status*: **Valid**. Maintain an `authGenerationRef = useRef(0)`. When `prevAuthKey !== currentAuthKey`, increment `authGenerationRef.current += 1`, reset `mutationSeqRef.current = {}`, and call `setRecords({})`. In `toggleComplete`, `savePosition`, and `refresh`, capture the current auth generation at mutation start. Require `authGenerationRef.current === capturedAuthGen` before applying any state updates or rollbacks.

3. **`lib/progress/progress-provider.tsx` (Line 287: `savePosition` response overwrites optimistic `completedLessonIds`)**:
   - *Inspected*: In lines 280-287, on receiving `data.record` from `save_position`, `setRecords` replaces the entire course record with `[data.record.courseId]: data.record`. If `savePosition` completes before a concurrent `toggleComplete` finishes, the server's older record (which lacks the newly completed lesson) clobbers the optimistic completion. On failure (lines 291-301), the rollback also restores `previousRecord`, clobbering completed lessons.
   - *Status*: **Valid**. `savePosition` owns only `lastLessonId`, `lastPositionSeconds`, and `lastUpdated`. Merge only these fields into `prev[courseId]` on response, and revert only these fields on failure rollback.

4. **`prompts/43-fix-review-findings-progress-bookmarks-course.md` (Lines 76-77, 77, 80-83)**:
   - *Inspected*: Prompt 43 is a historical implementation plan already executed in commits `1cee08c` and `ec256d1`. We do not rewrite past prompt files.
   - *Web Locks suggestion*: **Skip**. Converting `runSynchronizedMutation` to asynchronous Web Locks violates AGENTS.md decisions (prompt 43 decision 2) requiring synchronous hook contracts for `toggleBookmark`, `addBookmark`, and `removeBookmark` so UI event handlers and unit tests remain synchronous. Document clearly in `use-bookmarks.ts` that `runSynchronizedMutation` provides best-effort synchronous coordination with bounded lock timeout.
   - *Storage failure handling & Auth invalidation*: Valid code concepts, addressed directly in `lib/bookmarks/use-bookmarks.ts` and `lib/progress/progress-provider.tsx` as noted above.

5. **`prompts/44-publish-progress-and-bookmarks-review-fixes-pr.md` (Line 34: Base-branch preflight)**:
   - *Inspected*: Prompt 44 is an already completed workflow prompt from the previous task. The branch `fix/review-findings-progress-and-bookmarks` and PR #14 were already created and published on GitHub.
   - *Status*: **Skip**. No change required for already executed publication steps.

## Decisions and assumptions

1. **Synchronous bookmark hook contract**: Keep `toggleBookmark`, `addBookmark`, and `removeBookmark` strictly synchronous. Use best-effort localStorage coordination with safe error boundaries around acquire, write, and release.
2. **In-memory resilience on storage failure**: When localStorage is unavailable, disabled, or throws `QuotaExceededError`, bookmark operations must still succeed in memory for the current session and notify React subscribers.
3. **Progress field ownership**: `toggleComplete` owns `completedLessonIds`. `savePosition` owns `lastLessonId`, `lastPositionSeconds`, and `lastUpdated`. They must never clobber each other's fields during optimistic updates, server reconciliations, or error rollbacks.
4. **Auth generation fencing**: Tracking an incrementing integer `authGenerationRef` provides an O(1) synchronous guard that cleanly drops any stale callbacks, rollbacks, or fetches initiated under a previous user session.

## Files expected to touch

- `lib/bookmarks/use-bookmarks.ts`
- `lib/bookmarks/bookmarks.test.ts`
- `lib/progress/progress-provider.tsx`
- `prompts/45-fix-review-findings-progress-and-bookmarks.md`

## Requirements

1. **`lib/bookmarks/use-bookmarks.ts`**:
   - In `persistBookmarks`:
     - Attempt `JSON.stringify` and `localStorage.setItem` inside a try/catch block.
     - Always update `cachedRaw` and `cachedBookmarks = nextBookmarks`.
     - Always dispatch `BOOKMARKS_EVENT` via `window.dispatchEvent` (wrapped in try/catch).
   - In `runSynchronizedMutation`:
     - Update JSDoc to explicitly state this is a best-effort synchronous cross-tab coordination lock with bounded timeout.
     - Ensure all storage accesses during lock acquisition, write, and lock release are guarded with try/catch.
2. **`lib/progress/progress-provider.tsx`**:
   - Introduce `const authGenerationRef = useRef(0)`.
   - When `prevAuthKey !== currentAuthKey`:
     - Increment `authGenerationRef.current += 1`.
     - Clear `mutationSeqRef.current = {}`.
     - Reset `setRecords({})`.
   - In `toggleComplete`:
     - Capture `const capturedAuthGen = authGenerationRef.current`.
     - On server response, check `authGenerationRef.current === capturedAuthGen && mutationSeqRef.current[courseId] === seq` before updating `records`.
     - In `catch`, check `authGenerationRef.current === capturedAuthGen && mutationSeqRef.current[courseId] === seq` before rolling back.
   - In `savePosition`:
     - Capture `const capturedAuthGen = authGenerationRef.current`.
     - On server response, check `authGenerationRef.current === capturedAuthGen && mutationSeqRef.current[courseId] === seq`. Merge only `lastLessonId`, `lastPositionSeconds`, and `lastUpdated` into `prev[courseId]`.
     - In `catch`, check `authGenerationRef.current === capturedAuthGen && mutationSeqRef.current[courseId] === seq`. Revert only `lastLessonId`, `lastPositionSeconds`, and `lastUpdated` to `previousRecord` values without overwriting `completedLessonIds`.
   - In `refresh`:
     - Capture `const capturedAuthGen = authGenerationRef.current`.
     - Only call `setRecords(map)` and `setIsLoading(false)` if `authGenerationRef.current === capturedAuthGen`.
3. **`lib/bookmarks/bookmarks.test.ts`**:
   - Add unit test verifying that when `localStorage.setItem` throws `QuotaExceededError`, `cachedBookmarks` updates and `BOOKMARKS_EVENT` is dispatched.
   - Add unit test verifying `runSynchronizedMutation` executes correctly and returns expected result even when storage is completely inaccessible.

## Security considerations

- Stale in-flight mutations from a prior user identity are discarded immediately upon sign-out or account switch, preventing cross-account state contamination.
- Storage errors or malicious storage interference cannot cause unhandled exceptions or denial of service in the bookmarking interface.

## Acceptance criteria

- `persistBookmarks` updates the in-memory cache and dispatches `BOOKMARKS_EVENT` even if `localStorage.setItem` throws.
- Switching users or logging out invalidates any in-flight progress mutations or refresh calls.
- In-flight `savePosition` resolutions or rollbacks do not overwrite `completedLessonIds` set by `toggleComplete`.
- `npm run test:unit`, `npm run lint`, and `npx tsc --noEmit` pass with zero errors.

## Checks to run

- `npm run test:unit`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Manual test steps

1. In the browser, toggle bookmarks with simulated restricted localStorage (or run unit tests) and verify the bookmark state updates and UI re-renders.
2. Sign in as User A, initiate progress actions, immediately sign out or switch accounts; verify User A's progress never leaks into User B's state.
3. Rapidly mark a lesson as completed while playing video (triggering simultaneous `savePosition`); verify completed status remains marked and is not wiped by position updates.
