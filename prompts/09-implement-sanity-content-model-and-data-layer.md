# Implement the Lopsis Sanity content model, standalone Studio, and read data layer

## Goal

Implement the first production-style Sanity foundation for Lopsis:

- A standalone Sanity Studio for authoring courses, embedded modules, lessons, instructors, and categories.
- A server-only Sanity read client for the private dataset.
- Typed GROQ queries and data-access functions for catalog, course, lesson, instructor, and category reads.
- Sanity TypeGen wired from the Studio schema to the Next.js query layer.

Do not build pages, rendering components, progress, video transcript documents, search, ingestion, authentication changes, or analytics in this task.

## Skills and documentation read

- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/schema.md`
- `sanity-best-practices/references/groq.md`
- `sanity-best-practices/references/nextjs.md`
- `sanity-best-practices/references/project-structure.md`
- `sanity-best-practices/references/typegen.md`
- Installed Next.js 16.3.3 guidance for data fetching, server/client boundaries, and environment variables under `node_modules/next/dist/docs/`.

## Existing code inspected

- Root Next.js workspace: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.env.example`, `.gitignore`.
- Existing app boundary: `app/layout.tsx`.
- Uncommitted embedded Studio setup: `app/studio/[[...tool]]/page.tsx`, root `sanity.config.ts`, `sanity.cli.ts`, and `sanity/`.
- Current Sanity helpers: `sanity/env.ts`, `sanity/lib/client.ts`, `sanity/lib/live.ts`, `sanity/lib/image.ts`, `sanity/structure.ts`, and the empty schema registry.
- Current worktree changes, including unrelated homepage CSS and Clerk work, which must remain untouched.

## Decisions and assumptions

1. Use **Lopsis**, never Vertex, in names, titles, comments, and copy.
2. Keep the existing Next.js app at the repository root as the web workspace. Create `studio/` as a separately runnable Sanity workspace rather than moving the entire web app into `web/`.
3. Migrate the in-progress embedded Studio into `studio/` and remove the embedded `/studio` route and root Studio-only configuration. Keep `next-sanity` and `@sanity/image-url` in the web workspace.
4. The dataset is private. All content reads use `SANITY_API_READ_TOKEN` from server-only code. Project ID and dataset remain public configuration values; the token must never be prefixed with `NEXT_PUBLIC_` or cross into client code.
5. Use a dated API version of `2026-09-02`, matching the existing setup date.
6. Use ordinary generated Sanity document IDs. Slugs are content fields, not IDs.
7. Model modules as embedded course objects with ordered lesson references. Lesson numbers and module numbers are derived from array order and are not stored.
8. Model lesson notes as Portable Text. All nested arrays retain Sanity `_key` values in query projections.
9. Store duration as integer seconds, price as a non-negative number, and display counts as non-negative integers. Keep currency out of this task because the product requirements define a price but do not define multi-currency behavior.
10. Model course/outcome imagery as Sanity images with alt text and hotspot support so the existing design can render both course imagery and outcome icons without hardcoded UI assets.
11. Use manual server-side fetching with explicit cache tags/revalidation support. Do not configure browser live-content tokens or Visual Editing in this task.
12. Generate and commit `sanity.types.ts` so the web workspace has schema and query result types without requiring Studio generation during every web build.

## Expected files to create or change

### Standalone Studio

- `studio/package.json`
- `studio/package-lock.json`
- `studio/tsconfig.json`
- `studio/sanity.config.ts`
- `studio/sanity.cli.ts`
- `studio/structure.ts`
- `studio/schema-types/index.ts`
- `studio/schema-types/documents/course.ts`
- `studio/schema-types/documents/lesson.ts`
- `studio/schema-types/documents/instructor.ts`
- `studio/schema-types/documents/category.ts`
- `studio/schema-types/objects/module.ts`
- `studio/schema-types/objects/learning-outcome.ts`
- `studio/schema-types/objects/resource.ts`
- `studio/schema-types/objects/content-image.ts`
- `studio/schema-types/blocks/portable-text.ts`
- `studio/schema.json` (generated)

### Next.js web workspace

- `sanity/env.ts`
- `sanity/lib/client.ts`
- `sanity/lib/fetch.ts`
- `sanity/lib/image.ts` only if its types or server boundary need adjustment
- `sanity/queries/fragments.ts`
- `sanity/queries/courses.ts`
- `sanity/queries/lessons.ts`
- `sanity/queries/instructors.ts`
- `sanity/queries/categories.ts`
- `sanity/data/courses.ts`
- `sanity/data/lessons.ts`
- `sanity/data/instructors.ts`
- `sanity/data/categories.ts`
- `sanity.types.ts` (generated)
- `.env.example`
- `package.json`
- `package-lock.json`
- `tsconfig.json` only if needed to explicitly include generated types

### Embedded Studio cleanup

- Remove `app/studio/[[...tool]]/page.tsx`.
- Remove root `sanity.config.ts` and `sanity.cli.ts` after their useful configuration is represented in `studio/`.
- Move Studio-only root schema and structure files into `studio/`; retain web-only files under root `sanity/`.
- Remove Studio-only dependencies from the root workspace after the standalone workspace owns them.

The exact file list may contract slightly if a separate object file adds no value, but responsibilities and workspace boundaries must remain as described.

## Content model requirements

### Course document

- Required `title`, unique generated `slug`, `summary`, cover image with alt text, `level`, non-negative `price`, instructor reference, category reference, and at least one module.
- Optional course icon image with alt text for compact course identity surfaces.
- `popular` boolean with a sensible initial value.
- Non-negative integer `studentCount` for display.
- Short ordered `learningOutcomes` array. Each item has required icon image, title, and description.
- Ordered `modules` array of embedded module objects.
- Preview shows title, level/category context where practical, and cover media.

### Module object

- Required title and summary.
- Ordered, unique array of lesson references with at least one lesson.
- No stored module or lesson number.

### Lesson document

- Required `title`, unique generated `slug`, HTTPS `videoUrl`, positive integer `durationSeconds`, and notes in Portable Text.
- Optional poster image with alt text and hotspot.
- `freePreview` boolean with a sensible initial value; it is presentational only.
- Non-negative integer `studentCount` for display.
- Short ordered list of key-point strings.
- Optional text `proTip`.
- Ordered resources array; each item contains required type, title, description, and HTTPS URL.
- No parent-course field. Parent course/module context is resolved through reverse references.

### Instructor document

- Required `name`, unique generated `slug`, photo with alt text, expertise, and bio.
- Bio uses Portable Text so it remains structured content.
- Preview shows name, expertise, and photo.

### Category document

- Required `title`, unique generated `slug`, and description.
- Preview shows title.

### Studio UX

- Use `defineType`, `defineField`, and `defineArrayMember` everywhere applicable.
- Give all documents and reusable objects suitable `@sanity/icons` subpath imports.
- Organize the desk explicitly as Courses, Lessons, Instructors, and Categories.
- Add clear field descriptions and proportionate validation without inventing workflow states or extra systems.

## Server-only client and data-layer requirements

- Add `import "server-only"` at the client/fetch boundary.
- Validate required environment variables at startup with actionable errors.
- Configure the client with project ID, dataset, API version, `useCdn: true`, the private read token, and published perspective.
- Expose a small typed `sanityFetch` helper supporting query params and Next.js cache tags/revalidation without exposing the raw token.
- Define every GROQ query with `defineQuery`; use unique descriptive constant names.
- Always project only required fields. Expand references once, include `_key` in arrays, and project slugs as strings.
- Provide typed data functions for:
  - `getCourses()` for catalog cards.
  - `getCourseBySlug(slug)` with instructor, category, learning outcomes, modules, and ordered lesson summaries.
  - `getLessonBySlug(slug)` with all lesson fields plus its reverse-resolved course, module, and derived order context needed to calculate labels later.
  - `getInstructors()` and `getInstructorBySlug(slug)`, with the detail read including referenced courses.
  - `getCategories()` and `getCategoryBySlug(slug)`, with the detail read including referenced courses.
- Return `null` for absent detail documents and arrays for list reads. Do not call `notFound()` inside the data layer.
- Do not return unprojected Sanity documents or tokens to callers.

## Security considerations

- `SANITY_API_READ_TOKEN` is required and server-only because the dataset is private.
- Do not configure a browser token, write token, mutation, client-side fetch, embedded Studio, or public dataset fallback.
- Keep `.env.example` value-free and include only documented variable names.
- Do not place secret values in generated types, schema output, logs, or error messages.
- Validate slug inputs as non-empty strings before querying and always pass them as GROQ parameters.
- Permit only HTTPS URLs in authored URL fields.

## Acceptance criteria

- Studio runs independently from `studio/` and exposes the five requested content types, with module embedded rather than listed as a document.
- The Next.js app no longer mounts Studio at `/studio`.
- Authors can create structurally valid courses whose ordered modules reference lessons.
- Lesson documents contain Portable Text notes, key points, pro tips, and resources, but no parent-course reference.
- The web Sanity client cannot be imported into a Client Component without a server-only build error.
- All required catalog/detail queries and data functions exist and use explicit projections.
- Lesson detail data resolves its course and module through reverse references.
- TypeGen successfully extracts the Studio schema, scans the web queries, and produces `sanity.types.ts`.
- Root web type-check, lint, and production build pass.
- Studio type-check/build and schema extraction pass.
- Existing unrelated Clerk and homepage changes are preserved.
- No implementation text or code introduced by this task uses Vertex as the product name.

## Checks to run

From the repository root/web workspace:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Start `npm run dev`, confirm the Next.js server boots, then stop it.

From `studio/`:

1. Install dependencies with the workspace's lockfile.
2. `npm run typecheck`
3. `npm run typegen`
4. `npm run build`
5. Start `npm run dev`, confirm the Studio server boots, then stop it.

Deployment commands that mutate the linked Sanity project (`sanity deploy` and `sanity schema deploy`) require valid credentials and explicit execution authority. Run them only if the environment is already authenticated and the approval covers deployment; otherwise report them under Needs your attention with their exact commands.

## Exact manual test steps

1. Copy the Sanity project ID, dataset, and private read token into local environment files using the names in `.env.example` and the Studio configuration.
2. In `studio/`, run `npm run dev` and open `http://localhost:3333`.
3. Confirm the desk lists Courses, Lessons, Instructors, and Categories, with no standalone Modules list.
4. Create and publish one category and one instructor.
5. Create and publish two lessons with slugs, HTTPS video URLs, duration seconds, notes, key points, and one resource each.
6. Create a course referencing the instructor and category; add one embedded module and reference both lessons in order; publish it.
7. In Studio Vision, run the exported course-detail query with the course slug and confirm references expand and lesson order is preserved.
8. Run the lesson-detail query with one lesson slug and confirm it returns the parent course, containing module, and the data required to derive module/lesson numbering without a parent field on the lesson.
9. Start the root Next.js app with `npm run dev` and confirm it boots without exposing a `/studio` authoring route.
10. Temporarily import a data function into a Server Component and verify the published fixture can be read from the private dataset; remove the temporary probe afterward.
