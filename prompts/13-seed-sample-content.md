# Seed sample content in Sanity

## Goal

Seed and harmonize production-quality sample content in the configured Lopsis Sanity dataset: 6 categories, 5 instructors, and 10 comprehensive courses with modules and lessons spanning programming, web development, AI engineering, data systems, and security. Ensure relational consistency (course equals the sum of its modules, module equals the sum of its lessons, zero orphaned references) and synchronize schema definitions, dataset fields, and environment configuration so catalog and cross-course queries work reliably.

## Skills and documentation read

- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/schema.md`
- `sanity-best-practices/references/groq.md`
- `sanity-best-practices/references/typegen.md`
- `sanity-best-practices/references/migration.md`
- `sanity-migration/SKILL.md`
- `node_modules/next/dist/docs/` for Next.js App Router and server data fetching boundaries.

## Existing code and data inspected

- `studio/scripts/seed/seed.ndjson`: 141 documents (6 categories, 5 instructors, 10 courses, 120 lessons).
- `studio/scripts/seed/videos.json`: 120 lesson video metadata entries matching lesson slugs.
- Current Sanity dataset: confirmed 141 documents and 135 image assets exist in the Sanity dataset.
- `studio/schema-types/`: schemas for course, lesson, instructor, category, module, learning-outcome, and resource.
- `sanity/queries/`: `fragments.ts`, `courses.ts`, `lessons.ts`, `instructors.ts`, `categories.ts`.
- `sanity/lib/client.ts` and `sanity/env.ts`: requiring `SANITY_API_READ_TOKEN` on the server.
- `.env.local` vs `studio/.env.local`: `SANITY_API_READ_TOKEN` present in `studio/.env.local` but missing from root `.env.local`.
- Schema divergences identified:
  - Lessons in seed use `duration` and `thumbnail`; schema and queries use `durationSeconds` and `poster`.
  - Modules in seed use `_type: "module"`; schema has `name: "courseModule"`.
  - Outcomes in seed use string icon names; schema defined `contentImage`.
  - Instructors in seed have array of strings for `expertise`; schema defined single string.

## Decisions and assumptions

1. **Keep Canonical Seed Data & Harmonize Schema**: Preserve all rich content in `seed.ndjson` (real video URLs, durations, descriptions, learning outcomes, and Portable Text notes).
2. **Dual-field compatibility**: Enrich lesson documents in the dataset to have both `durationSeconds` and `duration`, and both `poster` and `thumbnail` (pointing to the uploaded image asset). This guarantees that existing queries and future queries work without breakage.
3. **Schema flexibility**:
   - Update `lesson` schema to declare `durationSeconds` and `poster` as primary, while gracefully supporting `thumbnail` and `duration`.
   - Update `learningOutcome` schema to accept string icon names (e.g. `'sparkles'`, `'code'`, `'route'`) as used in the UI badges, as well as optional images.
   - Update `instructor` schema to accept `expertise` as either a string or string array.
   - Update `course` schema to support `module` and `courseModule` as module item types.
4. **Relational Consistency**:
   - Every course embeds exactly 4 modules.
   - Every module contains an ordered list of references to exactly 3 lessons.
   - Each course represents the sum of its 4 modules (12 lessons total per course).
   - Across all 10 courses, exactly 120 unique lessons are referenced with 0 unreferenced lessons and 0 missing references.
5. **Private Dataset Security**:
   - Copy `SANITY_API_READ_TOKEN` from `studio/.env.local` into root `.env.local` for server-side Next.js fetching.
   - Never expose `SANITY_API_READ_TOKEN` to the browser or commit secrets to git.
6. **Type Safety**:
   - Run Studio schema extraction and TypeGen to update `studio/schema.json` and `sanity.types.ts`.

## Files expected to change

- `.env.local`: add `SANITY_API_READ_TOKEN` for server reads.
- `studio/schema-types/documents/lesson.ts`: support `durationSeconds`/`duration` and `poster`/`thumbnail`.
- `studio/schema-types/documents/instructor.ts`: support string or string array for `expertise`.
- `studio/schema-types/objects/learning-outcome.ts`: support icon token strings.
- `studio/schema-types/objects/module.ts`: support `module` type name / alias.
- `studio/schema-types/documents/course.ts`: reference `module` / `courseModule`.
- `studio/scripts/seed/seed-content.ts`: deterministic script to validate, enrich, and seed/patch the dataset.
- `studio/schema.json` (generated via TypeGen).
- `sanity.types.ts` (generated via TypeGen).

## Requirements

1. Ensure root `.env.local` has `SANITY_API_READ_TOKEN` set matching `studio/.env.local`.
2. Update Sanity schemas in `studio/schema-types/` so they accurately match the seeded content and UI needs.
3. Execute the seed/enrichment script to ensure all 141 documents in the Sanity dataset are fully populated with consistent fields:
   - 6 categories with title, slug, description.
   - 5 instructors with name, slug, photo asset reference, expertise, and Portable Text bio.
   - 10 courses with title, slug, summary, coverImage asset reference, level, price, studentCount, learningOutcomes, instructor reference, category reference, and 4 embedded modules.
   - 120 lessons with title, slug, videoUrl, poster/thumbnail asset reference, durationSeconds/duration, freePreview, studentCount, Portable Text notes, keyPoints, and resources.
4. Verify relational integrity:
   - Every module has 3 lessons; module duration equals the sum of its lessons.
   - Every course has 4 modules; course duration equals the sum of its modules (and sum of all 12 lessons).
   - All 120 lessons are referenced; 0 unreferenced lessons; 0 dangling references.
5. Re-extract Studio schema and run Sanity TypeGen to produce up-to-date `studio/schema.json` and `sanity.types.ts`.
6. Verify all GROQ queries in `sanity/queries/` execute successfully and return populated objects (no null `poster`, `durationSeconds`, or `modules`).

## Security considerations

- `SANITY_API_READ_TOKEN` remains server-side only in `.env.local`.
- No tokens or credentials are logged or committed.
- Mutations are run against the configured dataset with explicit document IDs (`createOrReplace` or patch) so reruns are idempotent.

## Acceptance criteria

- 10 courses, 120 lessons, 5 instructors, and 6 categories are present and valid in the Sanity dataset.
- In each course, `moduleCount` is 4, `lessonCount` is 12, and all referenced lesson documents exist.
- Each lesson has positive `durationSeconds`, a valid `poster` asset reference, and rich Portable Text `notes`.
- Studio builds cleanly (`npm run build` in `studio/`).
- Web workspace type checks (`npx tsc --noEmit`), lints (`npm run lint`), and builds (`npm run build`) without errors.
- GROQ queries against the live dataset return complete, valid data.

## Checks to run

1. `npx tsx` validation script checking all document counts, relations, and non-null fields in Sanity.
2. `npm run build` in `studio/`.
3. `npx sanity schema extract` and `npm run typegen` in `studio/`.
4. `npx tsc --noEmit` in root.
5. `npm run lint` in root.
6. `npm run build` in root.

## Exact manual test steps

1. In `studio/`, run `npm run dev` and navigate to `http://localhost:3333`.
2. Open Courses -> inspect "Next.js App Router in Depth" and "Building AI Apps with LLMs". Confirm all modules and lessons are linked and valid with zero validation warnings.
3. Open Lessons -> inspect any lesson. Confirm duration, poster thumbnail, and Portable Text notes display cleanly.
4. Run `npx tsx sanity-check-queries.ts` to confirm server-side GROQ queries return full course structures.
