# Implement Learner Progress Schema, Server API Route & Client State Hook

## Goal

Establish the core learner progress data layer across Sanity and Next.js: define the Sanity `progress` document schema in Studio, create a server-only Sanity write client with token safety, build the authenticated Next.js server route (`/api/progress`) with Clerk user authorization and PostHog event capture, and deliver a reactive client state hook/provider (`useLearnerProgress`) with optimistic updates.

## Guidance read and code inspected

- `AGENTS.md`, specifically:
  - Section 5: Architecture and workspace separation. Data access is server-only; browser holds no write token and never writes progress directly; all mutations go through a server route.
  - Section 7: Progress is tracked per learner (completed lessons, resume position). Auth is Clerk. Product analytics is PostHog.
  - Section 8: Content modeling for `progress` (`userId`, `course` ref, `completedLessons` refs, `lastLesson` ref, `lastPositionSeconds`, `lastUpdated`). Kept apart from read-only course content.
  - Section 12: Private dataset rules, write tokens server-only, Clerk secret key server-only, PostHog project key public.
  - Section 13: Checks to run (typecheck, lint, build).
  - Section 15: Task 1 specification and downstream dependencies (Tasks 2, 3, 4, 6, 7).
- `.agents/skills/clerk-nextjs-patterns/SKILL.md`:
  - Server-side auth via `await auth()` from `@clerk/nextjs/server`.
  - API route authentication, handling 401 Unauthorized for unauthenticated requests.
- `.agents/skills/sanity-best-practices/SKILL.md`:
  - Schema definitions using `defineType`, `defineField`, `defineArrayMember`.
  - Desk structure integration in `studio/structure.ts`.
  - Mutation best practices with `createIfNotExists`, `patch`, `setIfMissing`, `insert`, and `unset`.
- Inspected existing codebase files:
  - `studio/schema-types/documents/` and `studio/schema-types/index.ts`: schema conventions, icon imports, validation patterns.
  - `studio/structure.ts`: desk structure list definition.
  - `sanity/lib/client.ts` and `sanity/env.ts`: client instantiation, server-only imports, env assertions.
  - `lib/posthog-server.ts`: existing `captureProgressEvent` and `captureServerEvent` helpers.
  - `lib/analytics/events.ts`: `ANALYTICS_EVENTS.lessonCompleted` and `ANALYTICS_EVENTS.resumeUsed` contracts.
  - `app/api/search/route.ts`: API route patterns, Zod validation, error handling, Next.js response helpers.
  - `proxy.ts`: Clerk middleware configuration.
  - `.env.example` and `.env.local`: environment variable definitions.

## Findings and decisions

1. **Studio Schema (`studio/schema-types/documents/progress.ts`)**:
   - Create document type `'progress'`.
   - Fields:
     - `userId`: `string`, required, read-only in Studio (managed by server route). Represents the Clerk user ID.
     - `course`: `reference` to `course`, required.
     - `completedLessons`: `array` of `reference` to `lesson`.
     - `lastLesson`: `reference` to `lesson`.
     - `lastPositionSeconds`: `number`, integer, min 0.
     - `lastUpdated`: `datetime`, required.
   - Preview shows the referenced course title, Clerk user ID, and count of completed lessons.
   - Add to `studio/schema-types/index.ts` and include a desk item in `studio/structure.ts` using `CheckmarkCircleIcon` from `@sanity/icons`.
2. **Server-Only Sanity Write Client (`sanity/lib/write-client.ts`)**:
   - Enforce `'server-only'`.
   - Read token from `process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.SANITY_API_READ_TOKEN`.
   - Provide clear assertion error if no token is available.
   - Set `useCdn: false` and `perspective: 'published'` for immediate consistency on progress reads and mutations.
3. **Environment Documentation (`.env.example`)**:
   - Add `SANITY_API_WRITE_TOKEN=` to `.env.example` with clear comments that it is server-only.
4. **Server Route (`app/api/progress/route.ts`)**:
   - Verify caller authentication with `const { userId } = await auth();`. Return 401 if missing.
   - Never allow caller to specify `userId` in query or body; enforce that all operations apply strictly to the authenticated `userId`.
   - **`GET` handler**:
     - Fetch all progress documents for `userId`:
       ```groq
       *[_type == "progress" && userId == $userId] {
         _id,
         userId,
         "courseId": course._ref,
         "courseSlug": course->slug.current,
         "completedLessonIds": coalesce(completedLessons[]._ref, []),
         "lastLessonId": lastLesson._ref,
         "lastLessonSlug": lastLesson->slug.current,
         lastPositionSeconds,
         lastUpdated
       }
       ```
     - Return `{ records: ProgressRecord[] }`.
   - **`POST` handler**:
     - Validate body using Zod (`progressActionSchema`):
       - Action `'toggle_complete'`: `{ action: 'toggle_complete', courseId: string, lessonId: string, completed?: boolean, completionSource?: 'manual' | 'video_ended' }`
       - Action `'save_position'`: `{ action: 'save_position', courseId: string, lessonId: string, positionSeconds: number }`
       - Action `'record_resume'`: `{ action: 'record_resume', courseId: string, lessonId: string, resumePositionSeconds: number }`
     - Compute deterministic document ID: `progress.${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${courseId.replace(/[^a-zA-Z0-9_-]/g, '_')}`.
     - Ensure document exists via `createIfNotExists`:
       ```typescript
       {
         _id: docId,
         _type: 'progress',
         userId,
         course: { _type: 'reference', _ref: courseId },
         completedLessons: [],
         lastUpdated: new Date().toISOString(),
       }
       ```
     - For `'toggle_complete'`:
       - If `completed` is `true` (or unset and not already in `completedLessons`), append unique lesson reference with patch or array mutation, and update `lastUpdated`.
       - If `completed` is `false`, remove reference from `completedLessons` and update `lastUpdated`.
       - On completion (`completed === true`), fire `captureProgressEvent(request, { event: ANALYTICS_EVENTS.lessonCompleted, properties: { course_id: courseId, lesson_id: lessonId, completion_source: completionSource ?? 'manual' } })`.
     - For `'save_position'`:
       - Patch `lastLesson = { _type: 'reference', _ref: lessonId }`, `lastPositionSeconds = Math.max(0, Math.floor(positionSeconds))`, `lastUpdated = new Date().toISOString()`.
     - For `'record_resume'`:
       - Fire `captureProgressEvent(request, { event: ANALYTICS_EVENTS.resumeUsed, properties: { course_id: courseId, lesson_id: lessonId, resume_position_seconds: Math.max(0, Math.floor(resumePositionSeconds)) } })`.
     - Return updated record `{ success: true, record: ProgressRecord }`.
5. **Client State Hook & Provider (`lib/progress/`)**:
   - `lib/progress/types.ts`: typed contracts for progress records, course progress state, and mutation payloads.
   - `lib/progress/use-learner-progress.ts` and `lib/progress/progress-provider.tsx`:
     - Global React context providing progress state to all client components across catalog, course, lesson, and header.
     - Automatically fetches progress when user is authenticated via Clerk `useAuth()`.
     - Provides helper methods:
       - `isLessonCompleted(courseId: string, lessonId: string): boolean`
       - `getCourseProgress(courseId: string, totalLessons?: number): CourseProgressSummary`
       - `toggleComplete(courseId: string, lessonId: string, completed?: boolean, source?: 'manual' | 'video_ended'): Promise<boolean>` with optimistic state update.
       - `savePosition(courseId: string, lessonId: string, positionSeconds: number): Promise<void>` (with client debouncing/throttling support).
       - `recordResume(courseId: string, lessonId: string, positionSeconds: number): Promise<void>`
       - `refresh(): Promise<void>`
       - `records`: map or array of user progress records.
       - `isLoading`: boolean.
     - Signed-out resilience: when user is not signed in, safely returns default zero-progress state without errors.
   - `app/layout.tsx`:
     - Mount `LearnerProgressProvider` inside `ClerkProvider` so the entire tree has access to progress data.

## Expected files

- `studio/schema-types/documents/progress.ts`: Sanity document schema definition.
- `studio/schema-types/index.ts`: export `progress` in Studio schema types.
- `studio/structure.ts`: add `Learner progress` to desk navigation.
- `sanity/lib/write-client.ts`: server-only authenticated write client.
- `.env.example`: add `SANITY_API_WRITE_TOKEN`.
- `lib/progress/types.ts`: TypeScript interfaces and types for progress data.
- `app/api/progress/route.ts`: authenticated Next.js API route handling `GET` and `POST`.
- `lib/progress/use-learner-progress.ts`: React hook to consume progress context.
- `lib/progress/progress-provider.tsx`: React Context Provider wrapping the app.
- `app/layout.tsx`: wrap children with `LearnerProgressProvider`.

## Requirements

1. Strictly maintain architectural separation: the browser never receives Sanity write credentials; all mutations are executed server-side.
2. Authenticate all progress mutations and fetches using Clerk's `await auth()`. Unauthenticated requests to `/api/progress` must receive HTTP 401.
3. Prevent unauthorized data access or IDOR: the server route must always derive the target user strictly from the verified Clerk session `userId`.
4. Sanity schema must validate `userId`, `course`, and reference integrity.
5. Mutations must be idempotent and resilient to race conditions (e.g. using `createIfNotExists` and set operations).
6. PostHog events `lesson_completed` and `resume_used` must fire strictly after Sanity persistence succeeds, using existing `captureProgressEvent`.
7. Client provider must support optimistic updates for instant UI feedback and graceful fallback when offline or unauthenticated.
8. TypeScript strict typing must be preserved across all new files.

## Security and privacy

- Keep `SANITY_API_WRITE_TOKEN` in server environment only. Never expose via `NEXT_PUBLIC_*`.
- Derive user identity exclusively from Clerk `auth().userId`. Never accept `userId` from request parameters.
- Sanitize any user input and document IDs before passing to Sanity mutation APIs.
- Do not log user IDs or tokens in server logs.

## Acceptance criteria

- `studio/schema-types/documents/progress.ts` is valid and Studio schema compiles cleanly with `npm --prefix studio run typecheck`.
- `sanity/lib/write-client.ts` successfully creates a server-only client using `createClient`.
- `/api/progress` route returns `401 Unauthorized` for unauthenticated requests.
- `/api/progress` route returns `200` with the user's progress records for authenticated requests.
- `POST /api/progress` correctly executes `toggle_complete`, `save_position`, and `record_resume` actions and persists changes to Sanity.
- `captureProgressEvent` triggers the appropriate PostHog events upon successful mutation.
- `LearnerProgressProvider` and `useLearnerProgress` provide clean, reactive state to any child component.
- Next.js typecheck (`npx tsc --noEmit`), lint (`npm run lint`), and build (`npm run build`) pass without regressions.

## Checks to run

1. Run `npm --prefix studio run typecheck` to verify Studio TypeScript and schema definitions.
2. Run `npx tsc --noEmit` in root web workspace to verify Next.js TypeScript definitions.
3. Run `npm run lint` in root web workspace to ensure no linting errors.
4. Run `npm run build` in root web workspace to confirm production build succeeds with the new API route and provider.
5. Verify unauthenticated access to `GET /api/progress` and `POST /api/progress` returns HTTP 401.

## Exact manual test steps

1. Send an unauthenticated request to `http://localhost:3000/api/progress` and verify response is HTTP 401 `{ error: "Unauthorized" }`.
2. Inspect Studio schema types and verify `progress` document is registered.
3. Sign in to Lopsis via Clerk in the browser.
4. In browser dev tools console, trigger a `GET` request to `/api/progress` and verify it returns HTTP 200 with `{ records: [] }` for a new learner.
5. Trigger a `POST /api/progress` request with action `toggle_complete` for a course and lesson ID. Verify HTTP 200 response with updated record containing the lesson in `completedLessonIds`.
6. Trigger a `POST /api/progress` request with action `save_position` for a course, lesson ID, and timestamp. Verify HTTP 200 response with updated `lastPositionSeconds` and `lastLessonId`.
7. Verify in PostHog debug/network events that `lesson_completed` fired on completion toggle.
