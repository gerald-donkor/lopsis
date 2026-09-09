# 55 — Real live content-corresponding images + high-quality video thumbnails across all pages

## Goal

Every image surface across Lopsis shows a real, live, high-quality image that corresponds to the actual content — not monogram letters, not generic SVG marks, and not random picsum placeholders:

- Course cards (home + catalog + instructor page + my-learning), course detail hero cover.
- Lesson thumbnails: curriculum rows (course page), rail + prev/next (lesson page), search video + lesson cards, my-learning saved lessons.
- Lesson video: provider thumbnail as poster overlay / fallback before the iframe loads.
- Instructor photos: real portrait per instructor on course hero, lesson header, instructor page.

Web-search image sourcing is part of this task: curate one high-quality, license-safe image per course (topic-corresponding, e.g. Next.js routing, React performance, Docker, TypeScript, Postgres, AI/RAG, security, system design) and confirm instructor portraits, then persist them as real Sanity image assets. Video thumbnails are derived from the lesson's own `videoUrl` so they always correspond to the video content.

## Skills read

- `sanity-best-practices` (`~/.claude/skills/sanity-best-practices/SKILL.md` + `references/image.md`): image schema with `hotspot`, `urlFor` builder with crop/fit, `next/image` pattern, LQIP requires explicit `metadata { lqip }` in GROQ; never serve production video from Sanity `file` assets (we store only embed URLs — already the case).
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`: `next/image` requires `images.remotePatterns` for every remote host; unlisted hosts throw at runtime.

## Code inspected

- `next.config.ts`: `images.remotePatterns` allows ONLY `cdn.sanity.io`. Any direct `i.ytimg.com` / `picsum.photos` / `randomuser.me` / Unsplash URL in `<Image>` will fail — this is why fallbacks render today.
- `studio/scripts/seed/seed.ndjson`: lessons carry `thumbnail._sanityAsset: image@https://i.ytimg.com/vi/<id>/hqdefault.jpg` (content-corresponding, but only 480x360 `hqdefault`); courses carry `coverImage._sanityAsset: image@https://picsum.photos/seed/.../1600/900` (random stock, NOT topic-corresponding); instructors carry `photo._sanityAsset: image@https://randomuser.me/...` (placeholder people).
- `studio/scripts/seed/seed-content.ts`: strips `_sanityAsset` when no existing `asset._ref` exists, so lessons seed with `poster: undefined` unless assets were uploaded.
- `studio/scripts/seed/upload-missing-assets.ts` (171 lines): handles courses + instructors ONLY — lessons are never uploaded. This is the root cause of missing lesson thumbnails in the live dataset (`poster.asset->url` is null).
- `lib/search/ground-results.ts`: `GROUND_CANDIDATES_QUERY` selects `"posterUrl": coalesce(poster.asset->url, thumbnail.asset->url)` but NOT `videoUrl`, so the UI has no provider-thumbnail fallback input.
- `lib/search/timestamp-resolution.ts`: `createEmbedUrl()` already parses YouTube (`youtube.com`/`youtu.be` → id), Vimeo (numeric id), Bunny (`mediadelivery.net`/`b-cdn.net`) — reuse its id parsing for thumbnail derivation; do not invent new URL parsing.
- `components/home-page.tsx` `CourseCard` + `CourseIcon`: renders custom SVG marks (Next/Docker/TS/Python/AI/React/…) — NOT the real `coverImage`. Catalog `components/course-card.tsx` DOES use `coverImage` via `urlFor`. Inconsistent.
- `components/search-page.tsx`: video cards use `posterUrl` with letter fallback; lesson-kind cards show keyPoints and NO image at all.
- `components/course-curriculum.tsx`, `components/lesson-page.tsx` rail + pagination, `components/my-learning-page.tsx` saved lessons: no thumbnails rendered.
- `components/lesson-video.tsx`: iframe only, no `poster` overlay.
- Design refs in `design/` (`lopsis-home/course/lesson/search.png`) are the visual source of truth — image slots reuse existing CSS classes/sizes; no restyle.

## Decisions and assumptions

1. Source of truth stays Sanity CDN. Web-searched images and provider thumbnails are UPLOADED as Sanity image assets (via the extended uploader), so the request path serves `cdn.sanity.io` only. Direct remote URLs in `<Image>` are the fallback chain only, and their hosts are allowlisted in `next.config.ts`.
2. Quality bar (hard minimums): course covers ≥1600×900; lesson/video thumbs prefer YouTube `maxresdefault.jpg` (1280×720) with `hqdefault.jpg` (480×360) fallback when maxres 404s; instructor portraits ≥480×480; course icons keep existing SVG marks (presentational, out of scope).
3. Content correspondence: lesson thumbs ALWAYS derive from that lesson's own `videoUrl` (YouTube id → `https://i.ytimg.com/vi/<id>/maxresdefault.jpg` → fallback `hqdefault.jpg`; Vimeo → `https://vumbnail.com/<id>.jpg` is NOT allowed (unverified third party) — Vimeo/Bunny lessons keep their Sanity poster, letter fallback only if truly missing; do not hotlink unverified thumbnail proxies). Course covers are web-curated per topic (Unsplash source URLs verified live with HTTP 200 + image content-type before upload; no picsum seeds, no random stock).
4. Instructor portraits: keep `randomuser.me` ONLY as the upload source (already seeded); do not invent real-human photos for fictional instructors. If a portrait asset is missing, keep the monogram fallback — do not hotlink a stranger's photo by name.
5. No schema changes. `poster`/`thumbnail`/`coverImage`/`photo` fields already exist. No model/LLM work. No token or auth changes; uploader keeps server-only read/write tokens.
6. Responsive behavior from AGENTS.md §3 holds: desktop exact per `design/`, stack/collapse sensibly on mobile.

## Files you expect to touch

- `next.config.ts` — add `remotePatterns` for `i.ytimg.com`, `i9.ytimg.com` (hosts only, no path tricks).
- NEW `lib/media/video-thumbnails.ts` — `getYouTubeVideoId(url)`, `getYouTubeThumbnailUrl(url, quality: 'maxres'|'high')`, `resolveLessonThumbnail({posterUrl, thumbnailUrl, videoUrl})`; pure functions + unit tests beside it.
- `studio/scripts/seed/upload-missing-assets.ts` — add section 3: lessons (`poster`/`thumbnail` from `_sanityAsset` OR derived YouTube maxres→hq URL; try maxres first, fall back to hq on 404; upload buffer, patch `poster`+`thumbnail`, unset `_sanityAsset`). Reuse existing `fetchImageBuffer`/`cleanUrl` patterns.
- `studio/scripts/seed/seed.ndjson` + `studio/scripts/seed/seed-content.ts` — ONLY if web search yields better per-course covers: replace `coverImage._sanityAsset` URLs with curated ones; keep lesson `i.ytimg.com` entries (they already correspond). Do not bulk-rewrite lessons.
- `sanity/queries/fragments.ts` + `sanity/queries/lessons.ts` + `lib/search/ground-results.ts` — include `videoUrl` wherever a thumbnail fallback is rendered (grounding query, `LESSON_SUMMARY_FRAGMENT`, lesson-by-slug rail/pagination needs).
- `components/home-page.tsx` — `CourseCard` shows real `coverImage` (via `urlFor`, 900×560, LQIP blur) in the existing card media slot; keep `CourseIcon` ONLY as the no-image fallback.
- `components/course-card.tsx` — add provider-thumbnail fallback: if `!coverImage?.asset`, derive from course's first lesson `videoUrl` when the query provides one, else keep existing letter fallback. (If the card fragment cannot cheaply carry it, document why and keep cover-only.)
- `components/course-curriculum.tsx` + `components/course-page.tsx` — lesson rows show 96px thumb (`poster` → provider fallback), `alt="{lesson} thumbnail"`, loading="lazy".
- `components/lesson-page.tsx` — rail items + prev/next show thumbs; header keeps instructor photo (already wired).
- `components/lesson-video.tsx` — poster overlay `<Image>` behind/above iframe using resolved thumb; hides on first `play` event. No custom player.
- `components/search-page.tsx` — video AND lesson cards show resolved thumb (lesson cards: thumb replaces/augments keyPoints visual, keep keyPoints list); grounding already supplies `posterUrl`, add `videoUrl` for fallback.
- `components/instructor-page.tsx`, `components/my-learning-page.tsx` — no layout change; verify photo/cover slots render real assets once uploaded (fix only if a slot still uses fallback despite asset existing).
- `.env.example` — only if the uploader needs a newly named var (avoid; reuse existing Sanity vars).

## Requirements

1. Web-search + verify: for each course topic, curate 1 high-quality image URL (Unsplash/Pexels/official docs art accepted; verify HTTP 200, `content-type: image/*`, width ≥1600). Record the chosen URL list + license/source in the prompt report or a `studio/scripts/seed/image-sources.md` note. Reject picsum seeds and any URL that 404s or returns HTML.
2. Thumbnails must correspond: every lesson thumb is that lesson's own video frame (`i.ytimg.com/vi/<id>/…`) or its uploaded Sanity copy — never a сосед lesson's image, never stock.
3. Upload first, render second: run the extended uploader against the live dataset so `poster.asset`, `coverImage.asset`, `photo.asset` refs exist; UI fallback chain is `poster.asset->url` → `thumbnail.asset->url` → provider maxres → provider hq → existing letter/SVG fallback (never empty `src`, never broken image icon).
4. `next/image` everywhere a photo/thumb/cover renders (Sanity `urlFor(...).width().height().fit('crop').auto('format')`, LQIP `placeholder="blur"` when queried, explicit `alt`, `loading="lazy"` except above-the-fold hero). No plain `<img>` for content images.
5. Keep `alt` honest: `Video thumbnail for {lesson}`, `Cover image for {course}`, `Portrait of {name}`; decorative SVGs keep `aria-hidden`.
6. No request-path video fetching: thumbnail derivation is pure string building from `videoUrl`; the only network fetch is the offline uploader. Browser never calls Sanity write APIs, never sees tokens.
7. Design fidelity: reuse existing classes/sizes from `design/*.png`; image slots fit current cards/rows/rail — no new chrome, no layout restyle.

## Security considerations

- Sanity read/write tokens stay server-side (uploader + server queries only); publishable-only values in the browser (existing Clerk/PostHog posture unchanged).
- Uploader validates remote bytes (status 200, image content-type, ≤15 MB cap) before `client.assets.upload`; skips + logs on failure, never writes partial refs.
- `next.config.ts` allowlists exact hosts (`cdn.sanity.io`, `i.ytimg.com`, `i9.ytimg.com`) — no wildcards, no `http:`.
- No PII: instructor portraits are the seeded placeholder faces; do not attach real people's photos to fictional instructor names.

## Acceptance criteria

- [ ] With a seeded + uploaded dataset, home, catalog, course, lesson (rail/prev-next/video poster), search (both card kinds), instructor, and my-learning show real images; zero monogram/SVG fallbacks where an asset exists.
- [ ] A lesson whose Sanity poster was deleted still shows its YouTube thumb via the `videoUrl` fallback (prove by unsetting one poster locally / unit test + manual check).
- [ ] YouTube thumbs load `maxresdefault` when it exists, else `hqdefault` (no 404 broken-image in Network panel).
- [ ] Course covers are topic-corresponding (review the source list), ≥1600px wide, no picsum URLs remain for courses shown in UI.
- [ ] `npm run lint`, production `npm run build`, and studio `sanity schema deploy` (or `sanity deploy` per AGENTS.md §13) all pass; no `next/image` remote-host errors in dev or build.

## Checks to run (report real output)

- In web: `npm run lint`, `npm run build` (routes/config/server changed), `npm run dev` smoke.
- In studio: `sanity schema deploy` + Studio app deploy (Context MCP requirement), then rerun uploader + `seed-content` import for covers/posters.
- Verify against live dataset: GROQ spot-check that lessons have `poster.asset->url`, courses have `coverImage.asset->url`.

## Exact manual test steps

1. `npm run dev`; visit `/`, `/courses`, one `/courses/<slug>`, one `/lessons/<slug>`, `/search?q=routing`, one `/instructors/<slug>`, `/my-learning` (signed in).
2. Each page: confirm covers/thumbs/portraits render (no letters), right-click → image URL is `cdn.sanity.io/…` (primary) or `i.ytimg.com/…` (fallback); Network tab shows no image 404s.
3. Search `q=<topic>`: both video and lesson cards show the lesson's own video thumb.
4. Lesson page: hard-refresh shows poster overlay, press play → overlay hides, video plays from `?start=` when opened from a video card.
5. Revoke test: temporarily Query-delete one lesson poster in Vision (`*[_id=="lesson.…"][0].poster`), reload search/lesson — provider thumb appears, no broken slot. Restore after.
6. Mobile 390px: cards stack, thumbs keep aspect, rail collapses per existing behavior.
