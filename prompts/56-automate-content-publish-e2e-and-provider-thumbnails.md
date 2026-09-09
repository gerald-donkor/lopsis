# 56 — Automate content publish, image smoke tests & provider thumbnails

## Goal

Remove the three manual leftovers from Task 55 by turning each into a checked-in, one-command automation:

1. **One-command content publish**: `assets:upload` → `seed` → Studio/schema deploy chained in `studio/package.json`, runnable unattended via env token.
2. **Automated image smoke**: Playwright e2e spec asserting every page shows real images with zero broken slots, runnable as `npm run test:e2e` and on every PR via GitHub Actions.
3. **Vimeo/Bunny thumbnails at ingest**: `ingest-videos.ts` fetches provider thumbnails (Vimeo oEmbed, Bunny Stream API) and stores them as Sanity `poster` assets, so no provider depends on UI fallbacks.

## Skills read

- `sanity-best-practices` (`references/image.md`, `references/migration.md`): upload remote bytes via `client.assets.upload`, patch refs, unset `_sanityAsset` staging fields; keep tokens server-side.
- `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`: Playwright e2e setup for App Router (webServer auto-start, `expect(page)` image assertions).

## Code inspected

- `studio/package.json`: scripts `ingest:videos` (`sanity exec scripts/ingest-videos.ts --with-user-token`), `deploy`, `schema:deploy`, `typegen`; NO scripts for `upload-missing-assets.ts` or `seed-content.ts` — both are plain `@sanity/client` node scripts reading `studio/.env.local` via `getEnvVar`, runnable with `npx tsx`.
- `studio/scripts/seed/seed-content.ts`: `createOrReplace` in batches of 25, then hard integrity gates (6 categories / 5 instructors / 10 courses / 120 lessons, 4 modules × 3 lessons, 0 lessons missing poster asset, 0 missing duration) — ideal publish gate; throws on mismatch.
- `studio/scripts/seed/upload-missing-assets.ts` (Task 55): courses → instructors → lessons; idempotent (`[PASS]` skip when `asset._ref` exists); maxres→hq fallback per lesson.
- `studio/scripts/ingest-videos.ts`: `parseVideoUrl`, `fetchYouTube` / `fetchVimeo` / `fetchBunny`, `extractVideo`, `run()` over `*[_type=="lesson" && defined(videoUrl)]` with `--dry-run` / `--force` / `--slug=` / `--concurrency=` flags. Vimeo/Bunny branches currently extract chapters/transcript but never touch `poster`.
- `lib/media/video-thumbnails.ts`: `getYouTubeVideoId` regex set to reuse for ingest-side id parsing (YouTube thumbs need no ingest change — uploader already covers them).
- `.env.example`: has Sanity read/write tokens, Studio vars; MISSING `SANITY_AUTH_TOKEN` (unattended `sanity` CLI), `BUNNY_STREAM_API_KEY` + `BUNNY_LIBRARY_ID` (Bunny thumbs), Playwright needs nothing secret.
- No `.github/workflows/` directory exists yet; root `test:unit` uses `tsx --test lib/**/*.test.ts`.

## Decisions and assumptions

1. Publish chain order is fixed: `assets:upload` → `seed` → `schema:deploy` → `deploy`. Seed's integrity gate (0 missing posters) fails the chain before deploy if uploads were skipped — fail fast, never deploy half-imaged content.
2. Unattended auth via `SANITY_AUTH_TOKEN` env (Sanity CLI standard); interactive `--with-user-token` stays the local default. Token is server/CI-secret only, added to `.env.example` empty.
3. Playwright runs against `npm run dev` via `webServer` config (repo has no `start`-against-build requirement); spec uses the live Sanity dataset, so it asserts presence + HTTP 200 of rendered `img` — it does NOT assert exact URLs (dataset-independent).
4. Vimeo thumbs: public oEmbed `https://vimeo.com/api/oembed.json?url=<videoUrl>` → `thumbnail_url` (no auth, rate-limit friendly, called only for lessons missing `poster.asset`). Bunny thumbs: `GET https://video.bunnycdn.com/library/{libraryId}/videos/{guid}` with `AccessKey` header → `thumbnailFileName` → `https://vz-<pullzone>.b-cdn.net/{guid}/{thumbnailFileName}`; GUID parsed from the stored Bunny embed/play URL via existing `parseVideoUrl`. Bytes fetched offline, uploaded through `client.assets.upload` — browser never sees the Bunny key.
5. Skip-and-log on any provider failure (oEmbed 404, Bunny 401, non-image bytes, >15 MB cap); never write partial refs; `--dry-run` reports what WOULD change. YouTube path untouched.
6. No schema changes; no UI changes expected (data-only task) — if the e2e spec needs a test hook (e.g. `data-testid` on poster fallback), adding a pass-through attribute is allowed, no visual change.

## Files you expect to touch

- `studio/package.json` — add `assets:upload` (`sanity exec scripts/seed/upload-missing-assets.ts --with-user-token` — or `tsx` if `sanity exec` proves wrong runner; verify by running), `seed` (same runner for `seed-content.ts`), `content:publish` (upload → seed → `schema:deploy` → `deploy` chain). Keep `ingest:videos` as-is, document composition.
- `studio/scripts/ingest-videos.ts` — add `fetchProviderThumbnail(parsed, lesson)` returning `{buffer, contentType, sourceUrl} | null`: Vimeo branch via oEmbed; Bunny branch via Stream API with `BUNNY_STREAM_API_KEY`/`BUNNY_LIBRARY_ID` env; reuse `fetchImageBuffer`-style validation (200, image content-type, ≤15 MB); patch `poster`+`thumbnail` only when lesson lacks `poster.asset._ref` unless `--force`. Respect `--dry-run`/`--slug=`/`--concurrency=` plumbing already present.
- `.env.example` — add `SANITY_AUTH_TOKEN=`, `BUNNY_STREAM_API_KEY=`, `BUNNY_LIBRARY_ID=` with one-line comments (server-only).
- NEW `tests/e2e/images.spec.ts` + `playwright.config.ts` — visit `/`, `/courses`, first `/courses/<slug>`, first `/lessons/<slug>`, `/search?q=routing`, first `/instructors/<slug>`, `/my-learning`; assert: no `.search-result-poster-fallback` / monogram-fallback nodes where assets exist, every `img[src]` responds 200 (via request interception or `fetch` from Node), lesson video frame contains a poster `img`, course hero cover present. Slugs discovered at runtime via page links (no hardcoded slugs).
- Root `package.json` — add `test:e2e` (`playwright test`), devDeps `@playwright/test`; add `e2e` to nothing else.
- NEW `.github/workflows/e2e.yml` — on pull_request: `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:e2e` with repo secrets (`SANITY_API_READ_TOKEN`, others per `.env.example`) — read-only secrets only; NO write tokens, NO `content:publish` in CI.
- `prompts/55-…md` — do not edit (historical record).

## Requirements

1. `cd studio && npm run content:publish` performs upload → seed (gates pass) → schema deploy → Studio deploy, stopping on first failure with a non-zero exit and naming the failed stage.
2. Unattended mode works: `SANITY_AUTH_TOKEN` set + `--with-user-token` omitted still authenticates (document exact invocation in the final report).
3. `npm run test:e2e` passes against a seeded+uploaded dataset; fails loudly (named assertion) if any lesson poster/cover/photo slot renders a fallback or 404s.
4. `ingest:videos --dry-run` reports which Vimeo/Bunny lessons would gain posters without writing; real run writes `poster`+`thumbnail` refs only for lessons missing them (or all with `--force`).
5. Bunny key never leaves server-side code; no new client-side env vars; no `NEXT_PUBLIC_*` additions.

## Security considerations

- `SANITY_AUTH_TOKEN`, `SANITY_API_WRITE_TOKEN`, `BUNNY_STREAM_API_KEY` are server/CI secrets: `.env.example` entries stay empty, `.env.local`/`studio/.env.local` stay gitignored (verify), CI uses GitHub Secrets, and only read-only tokens are exposed to the e2e job.
- Provider fetches validate status/content-type/size before `assets.upload`; user-Agent header like existing uploader; Vimeo oEmbed needs no key — do not invent auth for it.
- `sanity exec` scripts run with the operator's token locally — document that `content:publish` writes production data and must target the intended dataset (`SANITY_STUDIO_DATASET` check echo at stage start, abort on mismatch with expected `production` unless `--dataset=` override is passed explicitly).

## Acceptance criteria

- [ ] Fresh checkout + env: `npm run content:publish` (from `studio/`) completes all four stages; seed integrity summary prints 6/5/10/120 with 0 missing posters.
- [ ] `npm run test:e2e` green on seeded dataset; red (with the exact missing-image assertion named) when a poster is removed in a scratch check.
- [ ] `ingest:videos --dry-run --slug=<a-vimeo-or-bunny-lesson>` names the thumbnail it would store; without `--dry-run` the lesson gains `poster.asset._ref`.
- [ ] `npm run lint`, `npm run build`, `npm run test:unit` still pass; no new `NEXT_PUBLIC_*` vars; git status shows no `.env.local` or token leakage.

## Checks to run (report real output)

- Web: `npm run lint`, `npm run build`, `npm run test:unit`, `npx playwright test` (full output tail).
- Studio: `npm run typecheck --prefix studio` if touched; dry-run the publish chain up to (not including) live deploy unless the user explicitly approves the deploy: `assets:upload --dry-run`-equivalent is not built — instead run upload against dataset only with approval; at minimum prove the chain parses (`npm run --dry-run` is NOT a thing — state clearly what was and wasn't executed live).
- Live MCP/Studio deploy only with explicit user go-ahead.

## Exact manual test steps

1. `cd studio && npm run assets:upload` → every lesson logs `[PASS]` or `[PATCHED]`, zero `[ERROR]`; Vision check `*[_type=="lesson" && !defined(poster.asset)]` returns empty.
2. `npm run seed` → integrity summary 6/5/10/120, 0 missing posters/durations.
3. `npm run content:publish` → all stages green (run only when ready to deploy).
4. `cd .. && npm run test:e2e` → all specs pass; open `playwright-report` and confirm per-page image assertions.
5. Negative: unset one lesson poster in Vision, rerun e2e → the spec fails naming that lesson/slot; restore, rerun → green.
6. `ingest:videos --dry-run --slug=<vimeo-or-bunny-lesson-slug>` → names provider thumbnail URL it would store; rerun without `--dry-run` → poster ref present; lesson page shows the thumb.
