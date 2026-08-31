# Rename design assets from Vertex to Lopsis

## Goal

Rename every PNG in `design/` whose filename starts with `vertex-` so it starts with `lopsis-` instead.

## Skills read

- None. This is a filesystem-only rename and does not involve application code, UI implementation, Sanity, Clerk, or Next.js APIs.

## Code and configuration inspected

- Listed the files under `design/`.
- Confirmed exactly five matching files exist.

## Decisions and assumptions

- "Replace the vertex for the file name" means changing the lowercase filename prefix `vertex-` to `lopsis-`.
- Preserve each file's PNG contents, remaining basename, and extension.
- Do not change text or pixels inside the images.
- Do not rename files outside `design/`.

## Files to rename

- `design/vertex-course.png` to `design/lopsis-course.png`
- `design/vertex-designsystem.png` to `design/lopsis-designsystem.png`
- `design/vertex-home.png` to `design/lopsis-home.png`
- `design/vertex-lesson.png` to `design/lopsis-lesson.png`
- `design/vertex-search.png` to `design/lopsis-search.png`

## Requirements

- Perform lossless filesystem renames.
- Preserve all five files.
- Leave unrelated files unchanged.

## Security considerations

- No secrets, network access, dependencies, or runtime behavior are involved.
- Resolve exact source and destination paths before renaming to avoid overwrites.

## Acceptance criteria

- No filename directly under `design/` starts with `vertex-`.
- The five expected `lopsis-*.png` files exist.
- File contents are byte-for-byte unchanged after renaming.

## Checks to run

- List files under `design/` after the rename.
- Compare pre- and post-rename checksums.
- Inspect Git status for the five expected rename pairs only.

## Manual test steps

1. Open `design/` in the file browser.
2. Confirm the five PNG files begin with `lopsis-`.
3. Open each PNG and confirm it still renders correctly.
