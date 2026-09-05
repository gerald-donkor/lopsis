# Implement the Sanity-backed Lopsis lesson page

## Goal

Implement a responsive dynamic lesson page at `/lessons/[slug]` using `design/lopsis-lesson.png` as the desktop visual source of truth and the existing seeded, private Sanity content as the source of every lesson-specific value.

The page must reproduce the reference's shared header, left course curriculum rail, breadcrumbs, lesson heading and metadata, on-page video, tabbed lesson content, resource cards, and previous/next lesson navigation. It must use **Lopsis** branding, not the incoming reference's “Vertex” wordmark. A selected lesson's provider video must play inside the page, not link learners away from Lopsis.

Do not add search, transcript ingestion, Sanity schema changes, learner-progress persistence, bookmark persistence, notifications, a custom video player, or any unrelated page.

## Skills and guidance read

- `AGENTS.md`
- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/nextjs.md`
- `sanity-best-practices/references/portable-text.md`
- Installed Next.js 16.3.3 App Router documentation under `node_modules/next/dist/docs/` for pages/layouts, dynamic routes, async `params`, server/client boundaries, and server-side data fetching.

## Code, configuration, and content inspected

- `design/lopsis-lesson.png` at its original 1024 × 1536 size.
- `package.json`, `.env.example`, `next.config.ts`, `app/layout.tsx`, `app/globals.css`, and `proxy.ts`.
- `components/site-header.tsx`, `components/course-page.tsx`, `components/course-curriculum.tsx`, and existing course routes for established Lopsis styling, header, analytics, dynamic-route, and responsive conventions.
- `sanity/queries/lessons.ts`, `sanity/data/lessons.ts`, `sanity/lib/client.ts`, `sanity/lib/fetch.ts`, and generated `sanity.types.ts`.
- `studio/schema-types/documents/lesson.ts`, `course.ts`, `objects/module.ts`, `objects/resource.ts`, and `blocks/portable-text.ts`.
- `studio/scripts/seed/seed-content.ts` and `seed.ndjson`; the import harmonizes legacy seeded `duration`/`thumbnail` values to the queried `durationSeconds`/`poster` fields, and the seeded lesson videos are YouTube URLs.

## Decisions and assumptions

1. The reference controls the visual outcome at desktop width: warm framed canvas, 280px left rail, hierarchy, spacing, borders, orange accent, typography, tab treatment, cards, and sticky bottom navigation. Sanity controls every course/lesson-specific string, image, duration, count, note, tip, resource, and curriculum item.
2. Use Lopsis throughout. The shared `SiteHeader` already has the Lopsis mark, navigation, notification control, and Clerk controls; reuse it rather than duplicating a divergent header.
3. Create `app/lessons/[slug]/page.tsx` as an async Server Component. Await the Next.js 16 `params` promise, fetch with `getLessonBySlug`, generate metadata, and call `notFound()` for missing lessons.
4. `getLessonBySlug` already derives the current module and one-based module/lesson numbers from the course's ordered references. Use that returned order to derive all labels and adjacent lessons. Do not store or invent parent-course data.
5. Keep the server page/read-only query separate from the small client components needed for video interaction, expandable rail modules, tab state, and PostHog capture. Do not import the Sanity client/data helpers into any Client Component.
6. Render `notes` as Portable Text with a typed component map for paragraph, heading, list, quote, and external-link output. Add `@portabletext/react` only if it is not already present through the direct dependency graph; use it rather than converting Sanity content to Markdown/HTML.
7. Build a small provider-embed utility/component. It must parse only supported HTTPS YouTube, Vimeo, and Bunny URLs; transform them to documented iframe embed URLs; add a safe integer `start` query value only for supported seek behavior; and render a useful in-page unavailable state for unsupported/malformed authored URLs. The currently seeded fixture exercises YouTube. The iframe must use a restrictive `allow` policy, a descriptive `title`, `referrerPolicy`, and a sandbox compatible with provider playback. No browser key, token, custom controls, or direct provider redirect may be added.
8. Read an optional `start` search parameter on the Server Component, validate/clamp it to a nonnegative integer and the lesson duration when available, and pass it to the video embed so future search-result links can start playback at that time. Do not make up a timestamp when it is absent.
9. The reference's player-control chrome comes from its video provider. Use the provider iframe in the exact rounded 16:9 content slot instead of mimicking a custom player. The poster image may be used as fallback/decoration only, never as a fake playable player.
10. The lesson rail starts with the current course summary and honest `0% complete` presentation because learner progress does not yet exist. It shows all course modules, expands the current module initially, marks no lesson completed, identifies the current lesson, and links all other lessons to their real slugs. Other modules are compact disclosures. Do not hardcode the screenshot's course, module count, progress, or lesson titles.
11. The lesson's short summary directly below the heading is the first meaningful plain-text paragraph from authored Portable Text notes; if absent, omit the summary rather than fabricate copy. Course level comes from the returned course data, so extend the existing lesson query projection only as needed. Duration and student count come from the lesson, never from the screenshot.
12. “Lesson Content” renders the author-provided Portable Text. “Notes” is presentational in this task and may show the same notes content under its tab; it must not create a separate notes backend. Render authored key points in the dedicated “In this lesson you will” section when available, and an optional pro-tip only when authored.
13. Render resources in authored order, with type-appropriate lightweight inline SVG icon and secure external links (`target="_blank"` and `rel="noreferrer noopener"`). Do not embed arbitrary URL content.
14. Previous/next links are adjacent lessons in the flattened author-defined module/lesson order. Hide/disable only the absent boundary action without pretending a lesson exists.
15. Capture the lesson-viewed event once on the client and capture an iframe load/playback-intent event without claiming true playback progress from cross-origin provider events. Progress persistence and precise watch analytics remain separate work.
16. Preserve unrelated changes, including any user-owned/generated `sanity.types.ts` modifications. If the query changes, regenerate TypeGen through the existing Studio script instead of hand-editing generated output.

## Files expected to create or change

- `app/lessons/[slug]/page.tsx`
- `components/lesson-page.tsx`
- `components/lesson-video.tsx` or a narrowly scoped provider/embed helper
- `components/lesson-curriculum.tsx` for client-only rail disclosure/tab/event behavior, if separation improves boundaries
- `app/globals.css` for page fidelity and responsive rules
- `sanity/queries/lessons.ts` only to add an essential existing display field such as course level
- `sanity/types.ts` only via the repository's TypeGen workflow if the query changes
- `package.json` and lockfile only if `@portabletext/react` must be added as a direct dependency

No Studio schema, seed content, environment, authentication, middleware, progress API, or write-token changes are expected.

## Requirements

### 1. Dynamic, safe data flow

- Serve `/lessons/[slug]` with the existing `getLessonBySlug` server-only helper and a parameterized slug.
- Await `params`, return the Next.js 404 for unknown lessons, and generate dynamic title/description metadata.
- Project only display fields needed by the page; use the already-returned reverse course reference and ordered modules.
- Keep all tokens and raw Sanity client usage on the server.

### 2. Page frame and curriculum rail

- Closely match the reference frame at 1024px: desktop header, vertical rail border, warm background/hatching, and two-column main content.
- Render course back link, compact course icon/title/progress, ordered module rows, real duration labels, lesson links, current-lesson state, and accessible disclosures.
- Derive module and lesson labels from array position. The active module begins expanded; users can collapse/expand it and other modules with correct `aria-expanded` and `aria-controls` state.
- Keep a truthful no-progress state until progress records are implemented.

### 3. Lesson header, content, and resources

- Render breadcrumbs: All Courses → current course → current module → current lesson, with real links where a route exists.
- Render a derived `Lesson M.N` eyebrow, title, optional bookmark-style presentational control, summary, duration, level, and formatted student count.
- Use visible semantic headings and no screenshot-specific hardcoded content.
- Render Portable Text safely, key points, optional pro tip, and authored resource cards in their proper sections. Omit empty optional sections cleanly.
- Tab controls use real buttons with accessible selected/panel relationships and no new persistence.

### 4. On-page provider video

- Show the actual authored video in the page through YouTube/Vimeo/Bunny's supported iframe embed mechanics.
- Support an optional valid `?start=<seconds>` on the lesson URL and seek within the video where the provider supports it.
- Never navigate a learner to the provider to watch, expose API keys, build custom playback controls, or place the transcript into the request/UI path.
- Make the player responsive, preserve the reference's aspect ratio/rounded corners, and supply a no-crash fallback for bad/unsupported provider values.

### 5. Adjacent navigation, responsive behavior, and accessibility

- Derive previous/next navigation from the flattened curriculum order, including its surrounding module title and duration.
- Make the bottom navigation sticky/fixed only while it remains usable and does not obscure content; reserve page-bottom space.
- At tablet/mobile widths, collapse or move the rail sensibly, stack metadata/resources, and avoid horizontal overflow while retaining the reference's desktop geometry.
- Use semantic landmarks, labelled icon-only controls, keyboard-operable tabs/disclosures, visible focus styles, descriptive iframe titles, meaningful image alt text, and reduced-motion-safe transitions.

## Security considerations

- Preserve `SANITY_API_READ_TOKEN` as server-only; do not send a client Sanity token, client query, raw document, or private environment value to the browser.
- Validate `slug` through the existing helper and use bound GROQ parameters.
- Treat `start` as untrusted input: parse integer-only values, reject negatives/NaN/unsafe values, and clamp against known lesson duration.
- Allow-list supported video hosts/protocols and construct embed URLs from parsed values. Do not interpolate arbitrary authored URLs into iframe `src`.
- Use a least-privilege iframe `allow`, safe referrer policy, compatible sandbox, and explicit external-link `rel` values.
- Render Portable Text through React components only; do not inject authored HTML or Markdown unsafely.
- Do not add content, progress, bookmark, or analytics writes from the browser.

## Acceptance criteria

- A valid seeded `/lessons/[slug]` page renders its real course, module, lesson, notes, resources, metadata, image, and video URL-derived embed.
- The fixture uses Lopsis branding and shows no visible Vertex wording.
- The in-page YouTube video loads and can be played without leaving Lopsis; a valid start query produces a provider embed URL with the expected start behavior.
- A second seeded lesson renders the same template using its own data; a missing slug returns 404.
- The current lesson/module and previous/next links match Sanity reference ordering.
- The left rail disclosures and content/notes tabs work with pointer and keyboard, announcing correct ARIA state.
- No counts, duration, current module number, student count, curriculum title, resource copy, or video data is hardcoded from the reference.
- The page is visually close to the supplied 1024px desktop reference and has no horizontal overflow at 1024px, 768px, or 375px.
- Type check, lint, production build, and development-route checks run with real output.

## Checks to run

From the repository root:

1. If a GROQ query changes, run the existing Studio TypeGen command from `studio/`, inspect its output, and preserve any unrelated user changes to `sanity.types.ts`.
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`
5. Start `npm run dev` and verify:
   - a valid seeded lesson route returns 200;
   - a second valid seeded lesson returns 200;
   - `/lessons/does-not-exist` returns 404;
   - a valid route with `?start=60` returns 200 and produces the expected provider start parameter;
   - `/`, `/courses`, and a course route still return 200.
6. Search implementation files (excluding `design/`) for visible `Vertex` text.

No Studio deploy, schema deploy, or content import is required because the task consumes existing schema and seeded content only.

## Exact manual test steps

1. Ensure root `.env.local` has the existing public Sanity project/dataset settings, server-only Sanity read token, and Clerk keys.
2. Run `npm run dev` from the repository root.
3. Open a known seeded lesson, for example the first lesson linked from `http://localhost:3000/courses/nextjs-app-router-in-depth`, at 1024 × 1536.
4. Compare it with `design/lopsis-lesson.png`: check the framed page, Lopsis header, course rail, breadcrumbs, title/meta row, player placement, tabs, rich content, key points, pro tip, resources, and adjacent navigation.
5. Press play in the embedded video and confirm it plays inside the page. Open the same route with `?start=60` and confirm the video starts/seeks at that point when supported.
6. Expand/collapse the rail modules, select both content tabs, and navigate previous/next; verify every link and label matches Sanity order.
7. Open a different seeded lesson and confirm all authored title, notes, video, resources, current module, and adjacent links change.
8. Open `/lessons/does-not-exist` and confirm the framework 404.
9. Resize to 768px and 375px; verify the rail/content reflow, readable controls, sticky navigation, and no horizontal scroll.
10. Navigate with keyboard only; confirm logical tab order, visible focus, functional tab/disclosure controls, and labelled icon controls.
11. Recheck `/`, `/courses`, and an existing course route for regressions.
