# Upload missing course cover and instructor image assets to Sanity

## Goal

Resolve the missing live images and fallback book icons in Sanity Studio's course and instructor lists by downloading the remote seed images, uploading them as genuine Sanity image assets (`sanity.imageAsset`), and linking them via `asset._ref` references in `course.coverImage` and `instructor.photo`.

## Skills and documentation read

- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/image.md`
- `sanity-best-practices/references/schema.md`
- `sanity-best-practices/references/migration.md`

## Existing code and data inspected

- `/home/dgk/Pictures/screenshot-2026-09-03_23-46-17.png`: Screenshot showing Sanity Studio at `http://localhost:3333/structure/course;course.practical-web-security`, where the Course list pane displays default `BookIcon` icons instead of course cover thumbnails.
- `studio/schema-types/documents/course.ts`: Defines `media: 'coverImage'` in preview prepare, which expects a Sanity image object with an `asset` reference.
- `studio/scripts/seed/seed.ndjson`: Contains raw documents where `coverImage` and `photo` use `_sanityAsset` strings (e.g. `image@https://picsum.photos/seed/...` and `image@https://randomuser.me/...`).
- `studio/scripts/seed/seed-content.ts`: During document harmonization, `tx.createOrReplace` was called directly without uploading `_sanityAsset` URLs to Sanity's asset pipeline, leaving 10 courses and 5 instructors with raw `_sanityAsset` strings and no `asset._ref`.
- Dataset inspection: Confirmed 15 documents currently hold unresolved `_sanityAsset` fields without `asset._ref` (10 `course` documents and 5 `instructor` documents), while all 120 `lesson` documents already have uploaded `sanity.imageAsset` references.

## Decisions and assumptions

1. **Upload remote images via Sanity Assets API**: Fetch the remote images specified in `_sanityAsset` (from Picsum and RandomUser) over HTTP, and upload them to Sanity via `client.assets.upload('image', buffer, { filename, contentType })`.
2. **Patch documents with valid asset references**: Update `course.coverImage` and `instructor.photo` to reference the newly created `sanity.imageAsset` ID (`asset: { _type: 'reference', _ref: assetDoc._id }`) and remove the obsolete `_sanityAsset` property.
3. **Harmonize seed tooling**: Update `studio/scripts/seed/seed-content.ts` so that future seeding automatically uploads or preserves image asset references instead of writing raw `_sanityAsset` fields.
4. **Preserve schemas and types**: No schema changes required, as `contentImage` already defines standard Sanity `image` types.

## Files expected to touch

- `studio/scripts/seed/upload-missing-assets.ts`: Dedicated script to fetch and upload missing image assets and patch all 10 courses and 5 instructors.
- `studio/scripts/seed/seed-content.ts`: Update seed script to ensure complete asset resolution.

## Requirements

1. Download each course cover image from its remote URL in `_sanityAsset` and upload it to Sanity as a `sanity.imageAsset`.
2. Patch each of the 10 `course` documents with `{ _type: 'contentImage', alt, asset: { _type: 'reference', _ref: assetId } }` and remove `_sanityAsset`.
3. Download each instructor photo from its remote URL and upload it to Sanity as a `sanity.imageAsset`.
4. Patch each of the 5 `instructor` documents with `{ _type: 'contentImage', alt, asset: { _type: 'reference', _ref: assetId } }` and remove `_sanityAsset`.
5. Verify that `*[_type == "course"]{_id, coverImage}` returns valid `asset._ref` references for all 10 courses.
6. Verify that `*[_type == "instructor"]{_id, photo}` returns valid `asset._ref` references for all 5 instructors.

## Security considerations

- All asset uploads and document patches use `SANITY_API_READ_TOKEN` (which carries write permissions) strictly server-side in offline CLI scripts.
- No tokens or credentials are logged or committed.

## Acceptance criteria

- All 10 course documents have a valid `coverImage.asset._ref` pointing to a `sanity.imageAsset`.
- All 5 instructor documents have a valid `photo.asset._ref` pointing to a `sanity.imageAsset`.
- Zero documents have dangling `_sanityAsset` fields.
- Sanity Studio list preview displays the real course cover image thumbnails instead of the fallback book icon.
- `npm run build` in `studio/` passes cleanly.

## Checks to run

1. `npx tsx studio/scripts/seed/upload-missing-assets.ts` to execute the upload and patch.
2. Verification script checking that 0 documents have `_sanityAsset` and all 15 documents have valid `asset._ref`.
3. `npm run build` in `studio/`.

## Exact manual test steps

1. Navigate to Sanity Studio at `http://localhost:3333/structure/course`.
2. Inspect the "Courses" list in the secondary pane.
3. Verify that each course item now displays a live cover photo thumbnail in the list item icon slot instead of the generic book icon.
4. Click on any course (e.g. "Practical Web Security") and confirm the "Cover image" field displays the uploaded image thumbnail and hotspot control.
5. Navigate to "Instructors" in the primary pane and verify each instructor displays their live portrait thumbnail.
