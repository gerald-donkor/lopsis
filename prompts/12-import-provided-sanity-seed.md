# Import the provided Lopsis Sanity seed

## Goal

Seed the configured Lopsis Sanity dataset exclusively from the supplied source files. Do not generate replacement content and do not modify either source file.

## Skills and documentation read

- `sanity-best-practices/SKILL.md`
- `sanity-best-practices/references/migration.md`
- Installed Sanity CLI help for `sanity datasets import` and `sanity documents query`.

## Existing code and data inspected

- `studio/sanity.config.ts` and `studio/sanity.cli.ts`, which read the target project and dataset from `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`.
- `studio/.env.local`, which has those configuration values (not to be displayed or changed).
- `studio/package.json`, which supplies Sanity CLI 5.31.2 through the Studio workspace.
- `studio/scripts/seed/seed.ndjson`: 141 documents — 6 categories, 5 instructors, 10 courses, and 120 lessons.
- `studio/scripts/seed/videos.json`: metadata for the same 120 lesson-video identifiers. It is a JSON object rather than Sanity-import NDJSON and contains no Sanity documents, chapters, or transcript chunks.
- Current Studio schema, which has no `video` document type.

## Decisions and assumptions

1. Import `seed.ndjson` as supplied with the Sanity CLI; its explicit document IDs mean `--replace` is necessary to make the configured dataset exactly reflect the provided seed on repeated runs.
2. Do not attempt to import `videos.json` directly: the CLI accepts a Sanity dataset export/NDJSON source, while this file is only external-video metadata. Converting it into documents would invent a schema and generated content, contrary to the request.
3. Use `videos.json` only as an integrity check: confirm its 120 keys match the 120 seeded lesson identifiers after removing each `lesson.` prefix.
4. Do not deploy the Studio or schema: this task changes neither, and import is the requested external mutation.
5. Do not expose credential values in commands, logs, the prompt, or the report. Use the existing Studio configuration/authentication.

## Files expected to change

- `prompts/import-provided-sanity-seed.md` only.

The following files are read only and must remain byte-for-byte unchanged:

- `studio/scripts/seed/seed.ndjson`
- `studio/scripts/seed/videos.json`

## Requirements

1. From `studio/`, verify Sanity CLI configuration resolves a project ID and dataset without printing secrets.
2. Execute the documented CLI import:

   ```bash
   npx sanity datasets import scripts/seed/seed.ndjson --dataset production --replace
   ```

3. Query the configured dataset with the Sanity CLI and report counts grouped by `_type` for the four seeded types.
4. Confirm the post-import counts are exactly category 6, instructor 5, course 10, and lesson 120 (141 total).
5. Verify the 120 `videos.json` keys match the 120 lesson seed IDs by local, read-only comparison.
6. Verify SHA-256 hashes of both provided files before and after import to prove they were not modified.

## Security considerations

- The import mutates only the configured Sanity dataset; `--replace` replaces documents with matching source IDs and does not delete unrelated dataset documents.
- Authentication stays within the Sanity CLI/session or existing environment. Never pass a token on the command line or print environment values.
- Do not send `videos.json` to a remote service because it is not an import payload for the current schema.

## Acceptance criteria

- The CLI reports a successful import of the supplied NDJSON file.
- Dataset counts exactly match the source document counts: 6 categories, 5 instructors, 10 courses, and 120 lessons.
- `videos.json` has a one-to-one key match with seeded lessons.
- Both source files have identical before/after SHA-256 hashes.
- No source or application files are modified.

## Checks to run

1. Read-only source document count/type summary.
2. Read-only `videos.json` key count and lesson-key comparison.
3. Before/after SHA-256 checks of both sources.
4. `npx sanity datasets import scripts/seed/seed.ndjson --replace` from `studio/`.
5. `npx sanity documents query` with a GROQ grouped-count projection from `studio/`.

## Exact manual test steps

1. In `studio/`, ensure the authorized Sanity CLI account has write access to the project/dataset in `studio/.env.local`.
2. Run `npx sanity datasets import scripts/seed/seed.ndjson --dataset production --replace`.
3. Run `npx sanity documents query 'count(*[_type == "course"])'` and confirm it returns `10`; similarly confirm category `6`, instructor `5`, and lesson `120`.
4. Open Studio and confirm the desk contains the imported Courses, Lessons, Instructors, and Categories.
