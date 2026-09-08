# AGENTS.md

You are a **principal-level full-stack engineer and AI implementation agent** building **Lopsis**, a production-style AI-powered learning platform with intelligent content search.

Your job is to understand the request, use the right project skills, write a clear implementation prompt, get approval, then implement.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 1. What you are building

Lopsis is a learning platform. Authors create courses in Sanity, and a Next.js site serves them to learners. What sets it apart is search. A learner types a plain language query and gets back ranked, clickable cards. Each card links straight to the exact second in a lesson's video where that topic is taught, and the video plays on the site itself.

Use **Lopsis** as the product name in all implementations. If any existing or incoming implementation text, code, copy, configuration, or asset refers to **Vertex**, replace that reference with **Lopsis** unless the user explicitly directs otherwise.

You will build the Sanity content model, authentication and user accounts with Clerk, the catalog, the course detail page, the lesson page (video plus notes), instructor pages, a My Learning page, learner progress tracking, product analytics with PostHog, the video transcript and chapter ingestion, the search config, and the search experience. Build nothing beyond that. Do not overbuild.

---

# 2. How to work

Follow this loop for every request:

1. Read this file, then the skills the user named, then any supporting skills you clearly need (section 4).
2. Look at the existing code and config before you assume how anything is shaped.
3. Ask one focused question only if the task is genuinely ambiguous.
4. Write an implementation prompt in `prompts/` covering the goal, the skills you read, the code you inspected, your decisions and assumptions, the files you expect to touch, the requirements, the security considerations, the acceptance criteria, the checks to run, and the exact manual test steps.
5. Ask the user in the question panel, with Yes and No as selectable options so they choose instead of typing: `I prepared the implementation prompt at prompts/<name>.md. Is this good to execute?`
6. Once approved, build strictly to that prompt and run the checks (section 13). Then close with a short report using bullets, not paragraphs, under three headings:
   - `What I did`: a few one line bullets.
   - `Test`: numbered steps to run or see.
   - `Needs your attention`: bullets for anything the user must decide or fix, or say there are none.
     Keep every line short. Put detail and rationale in the prompt file, not in this report.

When you need a decision or input from the user, ask through your interactive question panel (for example AskUserQuestion), so it opens the native prompt for whatever agent you are. Use plain text only if you have no such panel.

Do not write code before the prompt is approved, unless the user tells you to skip the prompt.

### Fast Workflow Shorthand Commands

To accelerate the development cycle through the build plan (section 15):

- **When the user enters `i` or `I`**:
  1. Inspect the build plan in section 15 to find the next sequential unimplemented task (`[ ]`).
  2. Inspect the current codebase, configs, schema, and dependencies relevant to that task.
  3. Write a complete, production-grade implementation prompt in `prompts/<number>-<task-name>.md` (continuing sequentially from prompt `41-`) covering the goal, skills, inspected code, decisions, files to touch, requirements, security considerations, acceptance criteria, checks to run, and exact manual test steps.
  4. Notify the user that the prompt is written and ready for review/approval in the next session with `y` or `Y`.
- **When the user enters `y` or `Y` (in this or a new session)**:
  1. Locate the latest prepared implementation prompt in `prompts/`.
  2. Treat `y` / `Y` as explicit user approval to execute that prompt immediately.
  3. Build strictly to that prompt, without drifting or overbuilding.
  4. Run all necessary checks (type check, lint, build per section 13).
  5. Update the task status in section 15 from `[ ]` to `[x]`.
  6. Return the standard three-heading completion report (`What I did`, `Test`, `Needs your attention`).

---

# 3. UI work

You do not design UI. The user gives you the design as desktop images plus a prompt. Reproduce them exactly: layout, spacing, typography, color, and states. There is no mobile reference, so make each page responsive down to mobile, adapting the layout sensibly (stack columns, collapse the lesson sidebar) while keeping the desktop exact. Do not restyle or improve beyond the reference. Reuse the components and Tailwind patterns already in the project before you add new ones. When there is a reference image, it is the source of truth, and this file says nothing about visuals on purpose.

---

# 4. Skills to lean on

Reach for these instead of guessing. Do not invent new ones.

- sanity-best-practices (`~/.claude/skills/sanity-best-practices/SKILL.md`), for workspace setup, schema, GROQ, TypeGen, Portable Text, and framework integration.
- sanity-migration (`~/.claude/skills/sanity-migration/SKILL.md`), for importing content into Sanity from another system.
- create-agent-with-sanity-context (`.claude/skills/create-agent-with-sanity-context/SKILL.md`), for wiring the search agent to the Context MCP.
- dial-your-context (`.claude/skills/dial-your-context/SKILL.md`), for the Context document's instructions and content filter.
- shape-your-agent (`.claude/skills/shape-your-agent/SKILL.md`), for the search agent's tone and guardrails.
- `node_modules/next/dist/docs/`, for Next.js routing, server and client boundaries, and data fetching.

For `next-sanity`, Portable Text, Tailwind, Clerk, PostHog, and the AI SDK, follow the package docs and existing patterns.

---

# 5. How the app is structured

The project is two standalone workspaces in one repo. Build it this way and do not embed the Studio inside Next.js. Keeping them separate is what preserves independent deploys, Studio auto updates, and TypeGen.

- A Studio workspace holds the Sanity schema and content authoring, nothing else.
- A web workspace holds the Next.js pages, the search UI, and all server side integration.

Inside web, keep these responsibilities apart:

- Pages (catalog, course, lesson, instructor) are read only. They display stored data.
- Auth is Clerk, wired through Next.js middleware. It gates whatever a feature marks as private, keeps its secret key on the server, and exposes only its publishable key to the browser.
- Data access is a server only Sanity client and fetch helper, reading a private dataset with a token.
- The search API is a server route that connects to the Sanity Context MCP, injects the schema and the system prompt, calls the LLM, and streams results back.
- The search UI is a client component that renders the search results page (video results and lesson results) from that response.
- Analytics is PostHog, running in the browser with the public project key and capturing the engagement events. Any server side capture keeps a private key on the server.
- The video pipeline is offline tooling that ingests transcripts and chapters into video documents. It never runs in the request path.
- The search config is a Sanity Context document holding the content scope and the query instructions.

Never cross these boundaries. The browser holds no token, never calls the MCP or the LLM, and never writes content or progress. Any write, such as saving progress, goes through a server route. The UI only shows stored data.

---

# 6. Tech stack

Use Next.js (App Router), Clerk for authentication, PostHog for product analytics, Sanity Studio with `next-sanity`, `@sanity/image-url`, and `@portabletext/react`, Tailwind with typography, the Sanity Context MCP over server side HTTP, the Vercel AI SDK with the Google provider from `@ai-sdk/google` and the stable `gemini-3.6-flash` model, `react-markdown` only for rendering the search reply, Zod for validating structured output, and TypeScript.

Do not use the `@sanity/context` Studio plugin when it lags the Studio's Sanity major version, `text::semanticSimilarity()` unless embeddings are enabled, an embedded Studio, a public dataset, a client side token, or a separate backend framework. Section 12 explains why.

---

# 7. Decisions already made for you

Build to these unless the user changes them. They exist because search quality and safety depend on them.

- Lopsis uses Google Gemini through `@ai-sdk/google`, with the stable `gemini-3.6-flash` model as the default. Keep `GOOGLE_GENERATIVE_AI_API_KEY` server only and use `GOOGLE_GENERATIVE_AI_MODEL` for model configuration. Do not introduce or restore OpenAI packages, credentials, model ids, or provider code unless the user explicitly requests a provider change.
- Search is the Sanity Context MCP plus an LLM, and you surface it as result cards, not a chatbox. The LLM writes GROQ over the schema through the MCP, and the UI renders structured lesson cards instead of conversational prose.
- Search is grounded. Say only what the data returns. Never invent a course, lesson, price, duration, or timestamp.
- Video intelligence lives in dedicated video documents, one per unique video. Each holds a table of contents and the transcript split into timestamped pieces (section 8). Lessons link to them by video URL. Treat these documents as an internal lookup and never show them to the user as results.
- Timestamps resolve in two stages. Match the chapters (the table of contents) first, and fall back to matching the transcript only if no chapter matches. Chapter labels are clean, and transcript text is the noisier backstop.
- Playback stays on the site through a provider embed. Videos are YouTube, Vimeo, or Bunny embeds shown on the lesson page with the provider's own player. Do not build a custom player. A result links to the lesson page with a start seconds query param, and the embed starts at that second using the provider's own start parameter. Never send the learner out to the provider.
- Content is coherent from top to bottom. A module's lessons genuinely cover that module's topic. If the lessons are unrelated to their module, search returns junk.
- Content is structured, using Portable Text and typed fields, never markdown. Markdown shows up only in what the search agent replies.
- Authentication is Clerk. Do not use Sanity's auth or roll your own. Keep browsing public and gate only what a feature marks as protected. Learner progress and any other per user state key off the Clerk user id. The browser never writes it directly. Those writes go through a server route with a write token, and this state is kept apart from the read only content the pages render.
- Progress is tracked per learner: which lessons they have completed and where they left off in a lesson (a resume position). Surface it as completion marks and a resume affordance on the catalog, course, and lesson pages.
- Product analytics is PostHog. Instrument the moments that show engagement: catalog and lesson views, a search performed, a video play and how far it is watched, and a lesson completed. The browser uses the public PostHog project key. Keep any private PostHog API key on the server.
- Search is a full results page, not a compact widget and not a chatbox. It returns all ranked matches with a result count and a sort control, and it shows two kinds of result, video moments and lessons (section 11).
- Some surfaces are presentational only, with no backend of their own: the My Learning page, the notifications bell, the lesson Notes tab, and the free preview badge. My Learning may read existing progress for display. Free preview is a label, not access control.

---

# 8. The data you are modeling

Here is the shape of the content in Sanity. The relationships and the fields called out below are fixed. Everything else about each field is yours to choose sensibly.

- A course is the top level. It has a title and slug, marketing fields (summary, cover image, level, price), an optional popular flag and a student count for display, a short list of learning outcomes for the what you'll learn section (each with an icon, a title, and a description), a reference to an instructor and a category, and an ordered list of modules.
- A module is an embedded object inside a course, not its own document. It has a title, a summary, and an ordered list of references to lessons. The numbers shown in the UI, like Module 5 or Lesson 5.1, are derived from order, not stored.
- A lesson is a document. It has a title and slug, a video URL, a poster or thumbnail image, a duration, a free preview flag, and a student count for display. It also has rich text notes in Portable Text, a short list of key points for the in this lesson you will section, an optional pro tip, and a list of resources (each with a type, a title, a description, and a url). A lesson does not store its parent course, so derive the course with a reverse reference when you need it.
- An instructor has a name and slug, a photo, expertise, and a bio. Surface the instructor on the course and lesson, and give each instructor their own page.
- A category has a title and slug and a description.
- A video document is built by the ingestion pipeline (section 9), one per unique video URL. It holds an id and url, a chapters array of `{ startSeconds, label }` for the table of contents, and a chunks array of `{ startSeconds, text }` for the transcript in short timestamped pieces. It never keeps the whole transcript in one field that a query would return wholesale.
- An agent context document is the search configuration: a content scope filter and the search agent's query instructions (section 10).
- A progress record captures a learner's state, keyed by the Clerk user id: which lessons they completed and their last position in a lesson. It is app state, written only through a server route, and kept apart from the read only content above.

---

# 9. How videos get their transcripts

Build the video documents with offline tooling, keyed by an id derived from the video URL, stripping any characters the datastore rejects in ids. Store the transcript as many short timestamped chunks, and store the source's chapter markers as the table of contents. Keep whole transcripts out of anything the request path returns.

The supported providers are YouTube, Vimeo, and Bunny, each shown as an embed on the lesson page. Ingestion is specific to each provider: to support one you need a way to turn its captions into chunks, a source of chapters or authored ones, and a playback and seek case for its embed. Do not treat a provider as supported until both ingestion and playback exist for it.

---

# 10. The search config document

The Sanity Context document lets the user tune the agent without a code change. It carries a content scope filter that limits the visible types to the content ones, and instructions that hold the query guidance from section 11, kept short as deltas the schema does not already make obvious. Use dial-your-context to write it. If the Studio plugin is not available (section 12), create and edit this document by import or through the Sanity MCP. Edits to it reach the agent on the next request, but changes to the inline system prompt need a server restart.

---

# 11. How search must behave

Search is a full results page, not a compact widget and not a chatbox. Keep it behaving like this.

- Return all relevant results, ranked best first, with a count (for example, found 28 results across 8 courses) and a sort control that defaults to most relevant. Do not cap to a handful. When nothing fits, show an empty state that points to the full catalog.
- Results come in two kinds, matching the design.
  - A video result is a lesson's video matched at a specific moment. Carry the course (name and icon), the module and lesson label (for example, Lesson 5.1 in Data Fetching and Caching), a thumbnail, the clip length, a short description, and the matched second. Its action watches from that second on the lesson page.
  - A lesson result is a lesson matched on its own topic. Carry the course, the module and lesson label, the lesson's key points, and a short description. Its action opens the lesson page.
- For a query, search both ways and merge: match lessons on their topic (title and notes), and match video moments (chapters first, then transcript, per section 7). Rank by specificity, so a title that contains the exact concept beats a broad keyword hit.
- Ground every result in real data. Never invent a course, lesson, timestamp, or count. The video documents stay an internal lookup, and a video result is always tied to the lesson that uses that video, never shown on its own.
- Text match is token based, so wildcard your keywords and OR multiple words. Never match a whole phrase as one pattern. You cannot text match a Portable Text field directly, so match its plain text projection.
- Put the critical query and ranking rules in both the inline system prompt and the Context document, because the model follows the system prompt more reliably.

---

# 12. Things that will trip you up

You cannot infer these from the code, so keep them in mind.

- The Context MCP only serves a dataset that has a deployed Studio application. A schema only deploy is not enough.
- The `@sanity/context` Studio plugin may not support the Studio's current Sanity major version. When it does not, do not install it. Edit the Context document by import, and expect Conversation Insights to be unavailable until the plugin catches up.
- Semantic search may be turned off. If `text::semanticSimilarity()` errors with embeddings not enabled, fall back to keyword match with wildcards. Turning embeddings on is a plan and billing decision.
- The model follows the inline system prompt more reliably than the injected Context document instructions, so put the critical rules in both.
- If the system prompt is a template literal, escape backticks inside it or the build fails.
- The search route should cache initial context. Once it does, your instruction and prompt changes only take effect after a server restart.
- Never return a whole transcript or chunks array to the model. It overflows the context window. Fetch only the filtered matches, a few per video.
- The dataset is private. Keep the read token on the server, never expose it to the client, and fetch all content server side.
- Keep project ids and keys in env, expose only client safe values to the browser, and keep a committed `.env.example` as the canonical list.
- Clerk's secret key is server only. Only its publishable key may reach the browser, and protect private routes in Next.js middleware, not in client code.
- Any write token, such as the one used to save progress, is server only and used only inside a server route. The browser never writes content or progress.
- PostHog's project key is public by design and may reach the browser. Any private PostHog API key stays server only.

---

# 13. Checks to run

Run these from the correct workspace and report the real output. Never claim a check passed without running it.

- In web: type check, lint, a production build when routes, config, or server code change, and the dev server.
- In Studio: deploy the Studio application, which is required before the Context MCP will serve the dataset, deploy the schema, and import content and config documents.

After you implement, run the type check and lint at minimum, add a build when routes, config, or server modules changed, and for search or ingestion work verify against the live MCP endpoint.

---

# 14. When in doubt

Keep it small. Use the relevant skill. Preserve the server and client boundaries and the private token rule. Match the provided UI exactly. Get specifics from setup and config instead of hardcoding them. Save a prompt and get approval before coding. Run the checks. Share exact test steps.

---

# 15. UI Feature Audit & Complete Build Plan

This section contains the comprehensive audit of all pages, features, buttons, and entities across Lopsis, followed by the phased sequential implementation plan.

---

### Audit: Current State vs Unimplemented UI Functionality

#### 1. Global Header (`components/site-header.tsx`)
- **Implemented**: Brand link (`/`), "Courses" link (`/courses`), Clerk auth buttons (`SignInButton`, `SignUpButton`, `UserButton`).
- **Unimplemented / Gaps**:
  - **"My Learning" Link (`/my-learning`)**: Currently links to `/my-learning` which returns a 404 because the route and page component do not exist yet.
  - **Notifications Bell Button**: `<button aria-label="Notifications"><Bell /></button>` has no click interaction or popover state. Needs an accessible presentational dropdown panel displaying notification status ("All caught up", "No new announcements", unread badge indicator, click-outside and `Escape` dismiss).
  - **Global `⌘ K` / `Ctrl+K` Shortcut**: Does not work globally from the header across all pages.

#### 2. Homepage (`app/page.tsx`, `components/home-page.tsx`)
- **Implemented**: Hero copy, "Explore Courses" button, search input form submitting to `/search`, weekly update announcement, course cards grid, bottom glow effect.
- **Unimplemented / Gaps**:
  - **Keyboard Shortcut**: `⌘ K` indicator is rendered in the search box, but pressing `Cmd+K` or `Ctrl+K` on the home page does not focus the search input.
  - **Learner Progress & Resume on Course Cards**: Per Section 7, progress must surface as completion marks and a resume affordance on catalog cards. Signed-in learners with progress should see a progress bar / completion percentage and a direct "Resume" affordance on cards for courses they have started.

#### 3. Course Catalog Page (`app/courses/page.tsx`, `components/all-courses-page.tsx`)
- **Implemented**: Catalog header, course count badge, responsive course card grid, empty state.
- **Unimplemented / Gaps**:
  - **Instructor Links**: The byline (`By {course.instructor.name}`) is static text. Per Section 8 ("give each instructor their own page"), it must link to `/instructors/[slug]`.
  - **Learner Progress & Resume Affordance**: Cards currently show static metadata only. For signed-in learners who have started a course, render progress indicators (percentage / completed modules count) and a direct resume action.

#### 4. Course Detail Page (`app/courses/[slug]/page.tsx`, `components/course-page.tsx`, `components/course-curriculum.tsx`)
- **Implemented**: Breadcrumb, course cover image, popular badge, title, summary, meta stats, learning outcomes grid, expandable curriculum modules, show all/fewer modules toggle.
- **Unimplemented / Gaps**:
  - **Instructor Attribution**: Section 8 requires surfacing the instructor on the course. Currently, instructor information is not displayed on the course detail page. Needs an instructor attribution section/card with photo, name linking to `/instructors/[slug]`, and expertise.
  - **Hero "Continue Learning" CTA**: Currently hardcoded to link to the first lesson regardless of user progress. Should dynamically route to the learner's last resume lesson (or first incomplete lesson) and dynamically adapt label ("Start Course" vs "Continue Learning" vs "Review Course").
  - **Bookmark Course Button**: Currently `<button className="course-bookmark" aria-label="Bookmark course (not saved)">` with static text and no interactive toggle. Needs full UI state (bookmarked vs not bookmarked), active icon styling, accessible aria feedback, and state persistence.
  - **Curriculum Lesson Status Indicators**:
    - Completed checkmarks (`Icon name="check"`) for completed lessons.
    - "In Progress" dot (`<i className="status-progress"/>`) for the active/resume lesson.
    - "Free preview" badge tag on lessons flagged with `freePreview: true` (Section 7: "free preview is a label, not access control").
  - **Bottom Fixed Progress Strip**: Currently hardcoded to `0% complete` with an empty track and a static link to the first lesson. Must calculate and render real learner progress (percentage, filled track width) and link the CTA to the resume lesson.

#### 5. Lesson Page (`app/lessons/[slug]/page.tsx`, `components/lesson-page.tsx`, `components/lesson-video.tsx`)
- **Implemented**: Left rail layout, breadcrumb, lesson title, summary, meta stats, overview Portable Text, key points list, pro tip callout, notes tab, resources cards, previous/next lesson pagination, video embed (YouTube, Vimeo, Bunny) with seek on load and PostHog analytics.
- **Unimplemented / Gaps**:
  - **Curriculum Rail Course Progress**: Hardcoded to `0% complete`. Must display the learner's actual progress percentage and progress bar fill.
  - **Curriculum Rail Lesson Items**: Lessons only display an empty bullet or "Now playing". Must render completion checkmarks for finished lessons and in-progress indicators.
  - **"Mark as Complete" / "Completed" Button**: A critical learner action currently missing from the page. Learners need an explicit interactive toggle to mark a lesson completed or uncompleted, persisting the record to the backend and triggering `lessonCompleted` analytics.
  - **Bookmark Lesson Button**: Currently `<button aria-label="Bookmark lesson"><Bookmark /></button>` with no interactive toggle or state. Needs interactive active state, tooltip, and state persistence.
  - **Instructor Attribution**: Surface the instructor avatar and name (linking to `/instructors/[slug]`) in the lesson header/meta.
  - **Video Resume Tracking**: While `LessonVideo` seeks to `startSeconds` if passed, it does not persist the learner's watch position (`lastPositionSeconds`) to the progress API on pause/unload or at milestones.
  - **Auto-Completion on Video End**: When `videoCompleted` fires in `LessonVideo`, automatically update learner progress to mark the lesson as completed.

#### 6. Search Page (`app/search/page.tsx`, `components/search-page.tsx`)
- **Implemented**: Grounded search via Context MCP + Gemini, relevance/alphabetical sorting, video result cards with timestamp links, lesson result cards, loading skeleton, error retry state, empty states.
- **Unimplemented / Gaps**:
  - **Learner Completion Indicators**: Result cards (both video and lesson cards) should indicate if the matched lesson has already been completed by the learner.

#### 7. Missing Entity Page: Instructor Detail Page (`/instructors/[slug]`)
- **Current State**: Entirely missing. Query `INSTRUCTOR_BY_SLUG_QUERY` and helper `getInstructorBySlug()` exist in `sanity/`, but no route or UI exists.
- **Requirements**:
  - Route `app/instructors/[slug]/page.tsx` with dynamic metadata.
  - Component `components/instructor-page.tsx` matching Lopsis design system.
  - Profile header: Instructor photo, name (`Playfair Display`), expertise tag badges, bio rich text, total courses count.
  - "Courses by [Instructor Name]" grid reusing `CourseCard`.
  - Breadcrumbs and navigation back to catalog.

#### 8. Missing Surface: My Learning Page (`/my-learning`)
- **Current State**: Entirely missing. Nav link in header points to `/my-learning` which 404s.
- **Requirements**:
  - Route `app/my-learning/page.tsx` with metadata.
  - Component `components/my-learning-page.tsx`.
  - Signed-out state: Friendly prompt to sign in with Clerk to view saved progress and courses.
  - Signed-in state with tabs:
    - **In Progress**: Courses the learner has started, showing progress bar (`X% complete`), lessons completed count (`Y of Z lessons`), and a prominent "Resume Learning" button routing straight to the last watched lesson & timestamp.
    - **Completed**: Courses with 100% completion, showing completion badge and "Review Course" CTA.
    - **Bookmarked**: Saved courses and lessons for quick reference.
  - Empty state when no courses have been started yet, with "Explore Catalog" CTA.

#### 9. Missing Data Layer: Learner Progress Backend & State Persistence
- **Current State**: No `progress` schema in Sanity, no server route to read/write progress, no write token client.
- **Requirements (per Sections 5, 7, 8, 12)**:
  - Sanity schema `progress` in `studio/schema-types/documents/progress.ts` (`userId`, `course` ref, `completedLessons` refs, `lastLesson` ref, `lastPositionSeconds`, `lastUpdated`).
  - Server-only Sanity write client using `SANITY_API_WRITE_TOKEN`.
  - Server route `app/api/progress/route.ts`:
    - Authenticated with Clerk `auth()`.
    - `GET`: Returns user's progress records (completed lesson IDs, resume positions per course).
    - `POST`: Saves progress updates (toggle lesson completion, update last resume position and lesson).
    - Captures PostHog server events (`lesson_completed`, `resume_used`) via `captureProgressEvent`.
  - Client state hook / provider (`lib/progress/use-learner-progress.ts`) providing optimistic updates and shared state across all pages.

---

### Phased Build Plan & Execution Tasks

Below are the 7 implementation tasks in precise dependency order. Use `i` to prompt the next pending task and `y` to execute it.

- [x] Task 1: Learner Progress Schema, Server API Route & Client State Hook (`prompts/41-learner-progress-schema-and-api.md`)
- [x] Task 2: Course Detail Page Progress, Resume & Curriculum Interactivity (`prompts/42-course-detail-progress-and-curriculum-interactivity.md`)
- [x] Task 3: Catalog & Home Page Progress Affordances & Instructor Links (`prompts/47-catalog-home-progress-and-instructor-links.md`)
- [ ] Task 4: Lesson Page Interactivity, Completion Toggle & Video Resume Persistence (`prompts/48-lesson-page-interactivity-and-video-resume.md`)
- [ ] Task 5: Instructor Detail Pages (/instructors/[slug]) & Profile UI (`prompts/45-instructor-detail-pages.md`)
- [ ] Task 6: My Learning Page (/my-learning) with Enrolled, Completed & Bookmarked Views (`prompts/46-my-learning-page.md`)
- [ ] Task 7: Notifications Dropdown, Global Search Shortcut (⌘K) & Search Page Completion Marks (`prompts/47-notifications-popover-and-global-shortcuts.md`)

---

#### Task 1: Learner Progress Schema, Server API Route & Client State Hook
- **Scope**:
  - Define Sanity `progress` document schema in Studio (`studio/schema-types/documents/progress.ts`) and export in `studio/schema-types/index.ts`.
  - Create server-only Sanity write client in `sanity/lib/write-client.ts` using `SANITY_API_WRITE_TOKEN` / `SANITY_API_TOKEN`.
  - Add `SANITY_API_WRITE_TOKEN` to `.env.example`.
  - Create protected server route `app/api/progress/route.ts` with Clerk `auth()` verification:
    - `GET`: Return all progress records for authenticated user.
    - `POST`: Handle `toggle_complete` (add/remove lesson from `completedLessons`) and `save_position` (`lastPositionSeconds`, `lastLesson`).
    - Capture `captureProgressEvent` for PostHog telemetry.
  - Create client hook `useLearnerProgress` (`lib/progress/use-learner-progress.ts`) with optimistic updates and SWR/fetch caching.

#### Task 2: Course Detail Page Progress, Resume & Curriculum Interactivity
- **Scope**:
  - Wire `CoursePage` to `useLearnerProgress`.
  - Render actual completion percentage and filled progress track in the fixed bottom strip.
  - Route hero "Continue Learning" and bottom strip CTA to the learner's current resume lesson or next uncompleted lesson.
  - Update `CourseCurriculum` lesson rows:
    - Render completed checkmarks for finished lessons.
    - Render in-progress dot for the current resume lesson.
    - Render "Free preview" badge tag on eligible lessons.
  - Implement interactive Course Bookmark button with active toggle styling, tooltip/toast feedback, and local/user state persistence.
  - Add instructor attribution in Course Hero with photo, name linking to `/instructors/[slug]`, and expertise.

#### Task 3: Catalog & Home Page Progress Affordances & Instructor Links
- **Scope**:
  - Update `CourseCard` in `components/all-courses-page.tsx` and `components/home-page.tsx` to read learner progress.
  - Display progress bar and completion percentage (`X% complete`) for enrolled/in-progress courses.
  - Add quick "Resume" affordance routing to the learner's last lesson.
  - Link instructor bylines (`By {course.instructor.name}`) to `/instructors/[slug]`.
  - Add `⌘ K` / `Ctrl+K` keyboard event listener on the Homepage search input.

#### Task 4: Lesson Page Interactivity, Completion Toggle & Video Resume Persistence
- **Scope**:
  - Wire `LessonPage` to `useLearnerProgress`.
  - Connect rail course progress bar to real learner progress percentage.
  - Render completed checkmarks and in-progress status in rail lesson items.
  - Add "Mark as Complete" / "Completed" toggle button in lesson header with loading and success states.
  - Implement interactive Lesson Bookmark button with active toggle and state persistence.
  - Surface instructor attribution in lesson header with link to `/instructors/[slug]`.
  - Update `LessonVideo` to:
    - Seek to saved resume position if no query `start` parameter is present.
    - Auto-save resume timestamp (`lastPositionSeconds`) on pause or at interval via progress API.
    - Automatically mark lesson complete on `videoCompleted` event.

#### Task 5: Instructor Detail Pages (`/instructors/[slug]`) & Profile UI
- **Scope**:
  - Create `app/instructors/[slug]/page.tsx` with dynamic metadata using `getInstructorBySlug(slug)`.
  - Create `components/instructor-page.tsx`:
    - Breadcrumbs: All Courses > Instructors > [Instructor Name].
    - Instructor Profile Header: High-res photo, name (`Playfair Display`), expertise pills, bio prose, courses count and student stats.
    - Courses Grid: Reusing `CourseCard` component to list all courses taught by the instructor.
    - Responsive layout down to mobile, matching Lopsis design system.
    - 404 handler when instructor slug is invalid.

#### Task 6: My Learning Page (`/my-learning`)
- **Scope**:
  - Create `app/my-learning/page.tsx` with metadata.
  - Create `components/my-learning-page.tsx`:
    - Header and responsive container matching platform layout.
    - Signed-out view: Clean banner prompting user to sign in or create an account with Clerk to see learning history.
    - Signed-in view with tabs:
      - **In Progress**: Cards for enrolled courses showing progress bar, lessons completed count, and direct "Resume Lesson" CTA.
      - **Completed**: Cards for courses with 100% progress, showing completed badge and "Review Course" CTA.
      - **Bookmarked**: List of saved courses and lessons.
    - Empty state when no courses have been started, pointing to `/courses`.

#### Task 7: Notifications Dropdown, Global Search Shortcut (`⌘ K`) & Search Page Completion Marks
- **Scope**:
  - Build interactive Notifications Popover in `components/site-header.tsx`:
    - Toggles on bell button click, with unread badge (0), accessible dialog ARIA attributes (`aria-expanded`, `aria-haspopup`).
    - Presentational content: "You're all caught up!", recent release announcements, mark all as read action.
    - Click-outside and `Escape` key handlers to close.
  - Implement global keyboard shortcut (`⌘ K` / `Ctrl+K`) across the site:
    - If on `/` or `/search`, focuses the active search field.
    - If on any other page, navigates to `/search` and focuses the input.
  - Update `SearchPage` (`components/search-page.tsx`) to show completion checkmark badges on lesson and video result cards for lessons already completed by the user.
