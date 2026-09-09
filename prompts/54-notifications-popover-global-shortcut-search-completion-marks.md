# Task 7: Notifications Dropdown, Global Search Shortcut (⌘K) & Search Page Completion Marks

## Goal

Close the three remaining Task 7 gaps from AGENTS.md Section 15 audit: (1) make the header bell an interactive presentational notifications popover, (2) make `⌘K` / `Ctrl+K` work globally across the site, (3) show learner completion marks on search result cards. No backend, no schema change, no new routes. Pure presentational + client-state wiring on top of the existing `useLearnerProgress` provider.

## Skills and guidance read

- `AGENTS.md` Sections 2 (prompt-first workflow), 3 (UI work: reproduce exactly, responsive to mobile), 5 (boundaries: pages read-only, browser never holds token, writes via server route), 7 (notifications bell / free preview are presentational only; progress surfaces as completion marks + resume affordance), 12 (Clerk secret server-only, PostHog public key browser-safe), 13 (checks), 15 Task 7 scope.
- `node_modules/next/dist/docs/` App Router guidance: `SiteHeader` is currently a server component; interactivity requires a client boundary. Keep the header shell server-rendered and isolate state in small `"use client"` components (`NotificationsPopover`, `GlobalSearchShortcut`). Use `usePathname` / `useRouter` from `next/navigation` only inside client components.
- PostHog browser pattern (`posthog-js`, `ANALYTICS_EVENTS` in `lib/analytics/events`): capture `search_shortcut_used`, `searchResultOpened` already exist; reuse, do not invent new server capture.

## Code, configuration, and references inspected

- `components/site-header.tsx` (44 lines, server component): brand link, `Courses` + `My Learning` nav, static `<button aria-label="Notifications"><Bell /></button>` with no state, plus `<AuthControls />`. Styles: `.home-header`, `.home-account > button` in `app/globals.css:421-442`.
- `components/home-page.tsx`: `"use client"`, local `⌘K` listener (lines 300-312) focusing `searchInputRef` (`#learning-search`), `<kbd onClick>` focus, `CourseCard` already wired to `useLearnerProgress` + resume. `app/layout.tsx` already wraps everything in `ClerkProvider` + `LearnerProgressProvider`.
- `components/search-page.tsx` (142 lines, `"use client"`): local `⌘K` listener (lines 76-86) focusing `inputRef` (`#results-search`), `ResultCard` renders `video` + `lesson` kinds with poster/title/action links, no progress wiring. Result shape in `lib/search/schema.ts:55-83` carries `courseId`, `lessonId`, `lessonSlug`, `kind`.
- `lib/progress/progress-provider.tsx` + `lib/progress/types.ts`: `isLessonCompleted(courseId, lessonId)`, `records`, `isSignedIn`, `isLoading`. `app/search/page.tsx`: `force-dynamic`, passes `initialQuery` to `<SearchPage>`.
- `app/globals.css:684-777`: `.search-canvas .home-header` overrides, `.search-shortcut` hidden on mobile. No popover or completion-badge styles exist yet.
- `prompts/` max index is `53-*`; this prompt is `54-*` (AGENTS.md references the old `47-notifications-*` name which collides with the shipped catalog prompt, so `54-` continues the sequence).

## Decisions and assumptions

1. **Header stays server; popover is a client island.** Convert only the bell into `components/notifications-popover.tsx` (`"use client"`) imported by `SiteHeader`. `SiteHeader` itself stays a server component to avoid forcing the whole header client. No backend, no fetch, no Clerk calls — static presentational content per Section 7.
2. **Single global shortcut, remove duplication.** Add `components/global-search-shortcut.tsx` (`"use client"`, mounted once in `app/layout.tsx` inside providers) as the authoritative `⌘K`/`Ctrl+K` handler. Remove the per-page `keydown` listeners in `home-page.tsx` and `search-page.tsx` (keep their `inputRef`s and `<kbd>` click-to-focus). Global behavior:
   - If `pathname === "/"`: focus `#learning-search`.
   - Else if `pathname startsWith "/search"`: focus `#results-search`.
   - Else: `router.push("/search")` and focus `#results-search` after navigation (poll/`requestAnimationFrame` retry ~1s, then give up silently). Do not steal focus from editable fields except to honor the shortcut (standard `⌘K` behavior: always honor, `preventDefault`).
   - Ignore repeat events (`event.repeat`), ignore non-`k` keys, require `metaKey || ctrlKey` without `altKey`/`shiftKey` modifiers beyond the combo.
   - Capture `posthog.capture("search_shortcut_used", { source })` once per invocation with `source` = current pathname.
3. **Search completion badge reuses `isLessonCompleted`.** Wire `SearchPage`/`ResultCard` to `useLearnerProgress()`. Badge condition: `isSignedIn && !isLoading && isLessonCompleted(result.courseId, result.lessonId)`. Render a small green `Completed` pill with check SVG next to the `search-kind` tag (both `video` and `lesson` kinds), `aria-label="Completed lesson"`. Signed-out or loading → render nothing (no layout shift, no skeleton). No new API calls; provider cache is the source of truth.
4. **Notifications content is static.** Panel: heading "Notifications", subline "You're all caught up!", 2-3 static release announcements (e.g. "New courses added every week", "AI search now finds exact video moments", "Resume learning from any card"), "Mark all as read" button that clears the unread dot locally (`useState`, no persistence required). Unread badge shows `0`-style dot initially? Per audit: unread badge indicator with count 0 → render dot only when `unread > 0`; after "Mark all as read" hide dot. Keep it simple: initial `unread = 2` (matches 2 announcements) or `1`; "Mark all as read" sets `0` and hides badge.
5. **Accessibility is non-negotiable.** Bell button: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="notifications-popover"`, `aria-label` includes unread state. Panel: `role="dialog"`, `aria-label="Notifications"`, `Escape` closes and returns focus to bell, click-outside closes (pointerdown listener + `ref`), focus panel heading on open, trap not required (non-modal popover). `⌘K` buttons keep `aria-keyshortcuts="Meta+k Control+k"`.
6. **Styling follows existing tokens.** New CSS in `app/globals.css` reuses header/card palette (`#f3ece7`, `#eadfd8`, `#e9532d`, green `#15803d` from home completed badge). Popover: absolute under bell (`position: relative` on `.home-account`), 320px card, radius 12px, shadow, z-index above nav. Mobile: popover anchors right, full-width-safe (`max-width: calc(100vw - 32px)`). Completion badge mirrors `.home-course-completed-badge` at 11px.

## Files expected to touch

- `components/notifications-popover.tsx` (new, `"use client"`): bell button + badge + dialog panel + click-outside/Escape handlers.
- `components/site-header.tsx`: replace static bell `<button>` with `<NotificationsPopover />`; keep everything else identical.
- `components/global-search-shortcut.tsx` (new, `"use client"`): global `keydown` handler, pathname-aware focus-or-navigate.
- `app/layout.tsx`: mount `<GlobalSearchShortcut />` inside `LearnerProgressProvider`.
- `components/home-page.tsx`: delete local `⌘K` `useEffect` (keep `searchInputRef`, `<kbd>` click); add `data-search-input` attr if needed for global query; keep PostHog `search_focused` on focus.
- `components/search-page.tsx`: delete local `⌘K` `useEffect`; wire `useLearnerProgress`; pass `completed: boolean` into `ResultCard`; render badge in `.search-result-top`.
- `app/globals.css`: `.notifications-*` popover/badge/panel styles + `.search-completed-badge` styles + responsive rules; add `position: relative` anchor on `.home-account`.

## Requirements

1. Notifications popover toggles on bell click, shows unread dot, `aria-expanded`/`aria-haspopup` correct, content presentational ("You're all caught up!" + announcements + "Mark all as read"), closes on outside click and `Escape` with focus return.
2. Global `⌘K`/`Ctrl+K` works from every route: focuses `#learning-search` on `/`, `#results-search` on `/search*`, navigates to `/search` and focuses from anywhere else. No double-focus or double-capture with removed local listeners.
3. Search result cards (both `video` and `lesson`) show a `Completed` checkmark badge iff the signed-in learner completed that `lessonId` in that `courseId`. Signed-out shows no badge.
4. No server/client boundary violations: no token in browser, no MCP/LLM calls from client, no direct Sanity writes, no new env vars, no schema change.
5. No visual restyle beyond the reference: reuse Lopsis tokens, keep desktop exact, responsive to 375px.
6. Typecheck, lint, and production build pass.

## Security considerations

- Client code touches only the existing `/api/progress` GET cache via provider; no new endpoints, no write path, no Clerk secret, no Sanity token in browser.
- Notifications content is hardcoded; no user input rendered, no `dangerouslySetInnerHTML`.
- Shortcut handler does not log keystrokes; only reacts to the `⌘K` combo and fires one PostHog event.

## Acceptance criteria

- [ ] Bell click opens/closes popover; badge hides after "Mark all as read"; `Escape`/outside-click closes; focus returns to bell; axe-clean ARIA (`dialog`, `aria-expanded`, `aria-haspopup`).
- [ ] `⌘K`/`Ctrl+K` on `/` focuses home search; on `/search` focuses results search; on `/courses`, `/courses/[slug]`, `/lessons/[slug]`, `/instructors/[slug]`, `/my-learning` navigates to `/search` and focuses.
- [ ] Completed lessons show `Completed` badge on both card kinds when signed in with progress; signed-out shows none; no layout shift.
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` pass with real output reported.

## Checks to run

1. `npm run typecheck` in repo root.
2. `npm run lint` in repo root.
3. `npm run build` in repo root (routes + layout + server/client boundaries changed).
4. `npm run dev` smoke: header, home, search, course, lesson, my-learning.

## Manual test steps

1. Start dev (`npm run dev`), open `http://localhost:3000/`.
2. Click bell → popover opens with "You're all caught up!", announcements, "Mark all as read". Press `Escape` → closes, focus back on bell. Click outside → closes.
3. Click "Mark all as read" → unread dot disappears; reload → dot returns (no persistence required).
4. On `/`: press `Ctrl+K` (or `⌘K`) → home search focuses + selects. Click `<kbd>⌘ K</kbd>` → focuses.
5. Navigate to `/courses`, press `Ctrl+K` → lands on `/search` with input focused. Repeat from a lesson page and `/my-learning`.
6. On `/search?q=fetch`: press `Ctrl+K` → results search focuses (no navigation).
7. Sign in (Clerk), complete a lesson (lesson page "Mark as complete"), then search for its topic → that card shows green `Completed` badge (video + lesson kinds). Sign out → badges gone.
8. Mobile 375px: header popover fits viewport; search badges don't wrap awkwardly; `⌘K` affordance hidden per existing rule.
