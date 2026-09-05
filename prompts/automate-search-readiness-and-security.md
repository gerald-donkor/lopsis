# Automate Gemini search readiness and dependency security

## Goal

Finish the Gemini search setup without exposing secrets, verify the live Sanity Context MCP-to-Gemini 3.6 search flow, and remediate the nine npm audit findings without downgrading `next-sanity` or applying an unreviewed force fix.

## Skills read

- `plugin-management`: used to determine whether an external Google account or secret connector could provision the API key. No relevant connected capability is available; the user completed the one-time key creation and saved it locally.
- `sanity-best-practices`: used to preserve the standalone Studio/web separation and supported Sanity integration while remediating the web dependency tree.

## Code and configuration inspected

- `.env.local` through boolean-only checks: `GOOGLE_GENERATIVE_AI_API_KEY` and `SANITY_API_READ_TOKEN` are configured. No secret values were read or printed.
- `lib/search/context.ts`: safely derives the Context MCP endpoint from the Sanity project, dataset, and default `lopsis-learning-search` slug when URL/slug overrides are absent.
- `app/api/search/route.ts`: uses `@ai-sdk/google`, `gemini-3.6-flash`, MCP tools, structured output, grounding, and safe errors.
- Root `package.json` and `package-lock.json`: `next-sanity@13.3.4` supports Sanity 5 or 6, while npm currently resolves the Sanity 5 peer and its older CLI chain.
- `studio/package.json`: the Studio is a separate workspace and is not the source of the root audit report.
- Current npm advisory graph: nine findings—five moderate and four high—all flow through the root `next-sanity` peer's Sanity CLI toolchain.
- Current upstream metadata: `next-sanity@13.3.4` is current; `sanity@6.12.0` is supported by it; the newer Sanity CLI/runtime chain uses patched `adm-zip@0.6.0`. Two upstream packages still pin vulnerable versions: `@vercel/frameworks` pins `js-yaml@3.13.1`, and `typeid-js` requests `uuid@^10.0.0`.

## Decisions and assumptions

- Keep `next-sanity@13.3.4`; npm's suggested downgrade to `11.6.13` is a breaking regression and is rejected.
- Add the required web-side `sanity` peer explicitly at the supported stable 6.12 line so npm resolves the current CLI/runtime chain.
- Add narrowly scoped npm overrides for `@vercel/frameworks > js-yaml` to patched `3.15.1` and `typeid-js > uuid` to patched `11.1.1` only if those exact vulnerable transitives remain after the Sanity update.
- Validate the overridden APIs used by their parents and remove any override that breaks the toolchain; never suppress audit output or claim remediation without a zero-vulnerability audit.
- Do not change the standalone Studio dependency in this task because it has its own package manifest/install lifecycle and the reported audit is from the web root. Handle a Studio major upgrade separately with Studio-specific migration/deploy checks.
- Leave `.env.local` untracked and unchanged because the user already configured the key.
- Use the existing default Context slug and derived HTTPS Sanity endpoint.

## Expected files to touch

- `package.json`
- `package-lock.json`

No source, UI, schema, Studio, or tracked environment file should change.

## Requirements

1. Keep `next-sanity` on 13.3.4-compatible releases; do not run `npm audit fix --force`.
2. Add the root web `sanity` peer at `^6.12.0` using npm so the lockfile remains synchronized.
3. Re-run the audit and add only the scoped patched transitive overrides still required to eliminate the `js-yaml` and `uuid` advisories.
4. Confirm the resolved `adm-zip` is at least 0.6.0, the affected nested `js-yaml` is at least 3.15.1, and the affected nested `uuid` is at least 11.1.1.
5. Run a production audit and full audit; both must report zero known vulnerabilities. Do not hide findings with audit configuration.
6. Verify Sanity CLI loading and the `typeid-js` functions exercised by Sanity after overrides.
7. Preserve the Google key as server-only. Never print, copy into a tracked file, or expose it to the browser.
8. Build Lopsis and execute a live representative search through the built server route using the configured Gemini key and Sanity Context MCP.
9. Validate only status, response schema, result counts, and grounded result identifiers during automation; do not log credentials or raw provider/MCP payloads.
10. If the live request fails because the Studio app, Context document, API access, or billing is unavailable, report the exact sanitized failure and preserve the successfully completed dependency work.

## Security considerations

- `.env.local` remains gitignored and secret values never appear in command output, prompts, logs, diffs, or tracked files.
- `GOOGLE_GENERATIVE_AI_API_KEY` remains server-only and is never renamed with `NEXT_PUBLIC_`.
- Avoid broad package overrides; scope overrides to the vulnerable parent's dependency edge.
- Do not downgrade `next-sanity`, disable npm auditing, use `--force`, or accept a broken Sanity CLI to produce a clean report.
- Preserve the private Sanity dataset token and server-only MCP boundary.

## Acceptance criteria

- The configured Google key is detected without its value being printed.
- `next-sanity` remains on the current 13.3 line.
- The web root resolves a supported Sanity 6.12 release.
- `npm audit` and `npm audit --omit=dev` each report zero vulnerabilities.
- Sanity CLI loading and TypeID conversion/generation smoke checks pass.
- TypeScript, ESLint, and the production Next.js build pass.
- A live search request reaches the derived Sanity Context MCP and Gemini 3.6 route.
- A successful live response conforms to the existing Zod-backed response contract and reports grounded result/course counts.
- No secret or raw provider response is exposed.

## Checks to run

From the web workspace root:

1. Boolean-only environment readiness check with `@next/env`.
2. `npm ls next-sanity sanity @sanity/cli @sanity/runtime-cli adm-zip js-yaml uuid`
3. Sanity CLI version/load smoke check.
4. TypeID generation and UUID round-trip smoke check.
5. `npm audit --json`
6. `npm audit --omit=dev --json`
7. `npx tsc --noEmit`
8. `npm run lint`
9. `npm run build`
10. Start the built application temporarily on an unused localhost port, submit `hybrid search` to `/api/search`, validate the status and response shape, then stop only that temporary process.
11. `git diff --check`
12. Review the focused package manifest and lockfile diff.

## Exact manual test steps

1. Restart the Lopsis development server so `.env.local` and the dependency update are loaded.
2. Open `/search`.
3. Search for `hybrid search`.
4. Confirm grounded lesson and video-moment cards appear with a result count.
5. Open one lesson result and confirm it links to the stored lesson.
6. Open one video result and confirm playback starts at its grounded timestamp.
7. Run `npm audit` at the web root and confirm it reports zero vulnerabilities.
