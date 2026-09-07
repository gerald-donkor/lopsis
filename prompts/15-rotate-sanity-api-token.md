# Rotate the exposed Sanity API token

## Goal

Automatically replace the exposed Sanity project token with separate least-privilege tokens for Lopsis web reads and local Studio seed tooling, update the local environment files without printing either secret, verify both tokens, and revoke the exposed token only after the replacements work.

## Skills and documentation read

- `sanity-best-practices/SKILL.md`
- Sanity authentication and project token documentation.
- Installed Sanity CLI 5.31.2 help for `sanity tokens add`, `list`, and `delete`.

## Existing code and configuration inspected

- Root `.env.local` uses `SANITY_API_READ_TOKEN` for private, server-only web reads.
- `studio/.env.local` also uses `SANITY_API_READ_TOKEN` for local seed scripts.
- `sanity/lib/client.ts` consumes the root token with the published perspective.
- `studio/scripts/seed/seed-content.ts` and `upload-missing-assets.ts` consume the Studio token and perform mutations, so that token requires Editor access.
- The installed CLI supports creating Viewer and Editor project tokens, listing token IDs, and deleting a selected token.
- The CLI is not currently authenticated and requires `npx sanity login` before token management.

## Decisions and assumptions

1. Create a project Viewer token labelled `Lopsis web reads` for root `.env.local`.
2. Create a separate project Editor token labelled `Lopsis local seed tooling` for `studio/.env.local`.
3. Keep the existing environment variable name because current code already consumes it; the two environment files will intentionally hold different values.
4. Never print, return, log, or commit either generated token.
5. Preserve every unrelated environment entry and repository change.
6. Identify the exposed token by the pre-rotation token value locally and its token-list metadata; revoke only that exact token after both replacements verify successfully.
7. If Sanity CLI login needs browser interaction, pause only for the user to complete that authentication.

## Files expected to touch

- `.env.local`: replace only `SANITY_API_READ_TOKEN` with the new Viewer token.
- `studio/.env.local`: replace only `SANITY_API_READ_TOKEN` with the new Editor token.
- A temporary helper under `/tmp` may be used to capture CLI secrets without exposing them; it must be removed after completion.
- No committed source file will change other than this prompt.

## Requirements

1. Authenticate the installed Sanity CLI as the user if needed.
2. Record the current token only in process memory for exact revocation matching; never print it.
3. Create the two labelled project tokens with Viewer and Editor roles.
4. Capture the returned secrets without allowing them into terminal output or conversation logs.
5. Replace only the corresponding values in the two local environment files.
6. Verify the Viewer token can query the configured private dataset.
7. Verify the Editor token can authenticate with write permission using a non-mutating permission check where supported; do not modify content merely to test access.
8. List token metadata and revoke only the exposed prior token.
9. Re-query with the Viewer token after revocation to confirm continuity.
10. Report token labels and verification outcomes, never token values.

## Security considerations

- Generated secrets must not appear in tool output, shell history, process arguments, git diffs, or the final response.
- Tokens remain in ignored `.env.local` files only.
- The web receives a Viewer token; write capability remains confined to offline tooling.
- Do not revoke first: replacements must be written and verified before the old credential is removed.
- Do not modify `NEXT_PUBLIC_*` variables or expose a token to browser code.
- Abort before revocation if the old token cannot be identified unambiguously.

## Acceptance criteria

- Root `.env.local` contains a working new Viewer token.
- `studio/.env.local` contains a working new Editor token.
- The two replacement token values differ.
- Private Sanity content reads succeed with the Viewer token.
- The old exposed token is revoked and no longer authorizes requests.
- No secret is printed or committed.
- No content documents or assets are changed.

## Checks to run

1. Confirm CLI authentication without printing credentials.
2. Run a minimal authenticated GROQ count query with the new Viewer token and report only the numeric result.
3. Confirm the new token metadata shows the intended Viewer and Editor roles.
4. Confirm the old token ID is absent after revocation.
5. Confirm `git status --short` shows no unexpected tracked changes.

## Exact manual test steps

1. Restart the root Next.js development server.
2. Open the Lopsis catalog and confirm courses load from the private dataset.
3. Restart the Studio development server and open the Courses list.
4. Confirm Studio content still loads normally.
5. Do not run a seed or asset-upload mutation merely to test the Editor token.
