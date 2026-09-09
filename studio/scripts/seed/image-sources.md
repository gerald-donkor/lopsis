# Image sources for Lopsis seed content (Task 55)

All URLs verified live (HTTP 200, `content-type: image/*`) on 2026-09-09 before
writing them into `seed.ndjson`. They are upload sources only — the offline
uploader (`upload-missing-assets.ts`) persists them as Sanity image assets, so
the request path serves `cdn.sanity.io` exclusively.

## Course covers (topic-corresponding, Unsplash, ≥1600px via `w=1600`)

| Course | Unsplash photo id | Why it corresponds |
|---|---|---|
| Next.js App Router in Depth | 1555066931-4365d14bab8c | Code on a dark editor screen (web framework code) |
| React Performance Engineering | 1633356122544-f134324a6cee | React logo artwork |
| TypeScript for Application Developers | 1516116216624-53e697fedbea | Code close-up (typed source) |
| Building AI Apps with LLMs | 1677442136019-21780ecad995 | AI gradient artwork |
| Retrieval-Augmented Generation from Scratch | 1620712943543-bcc4688e7485 | AI robot hand (retrieval/AI systems) |
| Python for Data Work | 1526379095098-d400fd0bf935 | Python/data code screen |
| System Design Foundations | 1558494949-ef010cbdcc31 | Server racks (infrastructure) |
| PostgreSQL for Developers | 1544383835-bda2bc66a55d | Server/network hardware (data infra) |
| DevOps with Docker and Kubernetes | 1605745341112-85968b19335b | Shipping containers (container metaphor) |
| Practical Web Security | 1563013544-824ae1b704d3 | Padlock (security) |

URL shape: `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1600&q=80`
License: Unsplash License (free use, no attribution required).

## Lesson thumbnails (content-corresponding by construction)

Derived from each lesson's own `videoUrl`: `https://i.ytimg.com/vi/<id>/maxresdefault.jpg`
(1280×720) with `hqdefault.jpg` (480×360) fallback. The uploader tries maxres
first and falls back to hq on 404; the search UI resolves
Sanity poster → provider maxres at request time.

## Instructor portraits

Seeded `randomuser.me` portraits (placeholder faces for fictional instructors).
Kept as upload sources; monogram fallback stays when an asset is missing.
No real people's photos are attached to fictional names.
