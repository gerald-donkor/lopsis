# Use server-owned GROQ for reliable Lopsis search

## Goal

Replace unreliable model-authored full GROQ with a deterministic, server-owned GROQ search plan. Keep Gemini for natural-language query interpretation, Sanity Context MCP for retrieval, and existing server-side grounding for final result authority.

## Why this follow-up is required

Live measurements from the approved timeout work showed:

- The original agent loop hit the 25-second route deadline.
- A four-step narrowed loop finished in 19.1 seconds but used every step for tool calls and emitted no structured output.
- A five-step loop took 44.5 seconds and emitted output that failed the candidate schema.
- A bounded two-phase model/tool flow hit the new 55-second internal deadline.
- One Gemini query-planning call with minimal thinking completed the full attempt in 6.6 seconds, but the generated GROQ was syntactically rejected by Sanity Context.
- Two fixed, projected, read-only GROQ query shapes were validated directly through the same Context MCP endpoint in 2.85 seconds total and returned real lesson and video matches.

The remaining instability is model-authored query syntax, not MCP availability, credentials, grounding, or route setup.

## Guidance and code inspected

- Root `AGENTS.md`, including the existing decision that the LLM writes GROQ. This prompt proposes changing that decision and therefore requires explicit user approval.
- `sanity-best-practices` GROQ performance guidance: indexed type filters, narrow projections, and bounded nested arrays.
- `create-agent-with-sanity-context`: initial context, read-only Context MCP access, and server-side integration boundaries.
- Installed Google AI SDK provider documentation: Gemini 3+ supports `thinkingConfig.thinkingLevel`; `minimal` materially reduced measured latency.
- `app/api/search/route.ts`, `lib/search/context.ts`, `lib/search/prompt.ts`, `lib/search/schema.ts`, and `lib/search/ground-results.ts`.

## Architecture decision requested

- Gemini will convert the learner's natural-language query into a small Zod-validated list of normalized semantic search terms.
- Server code will safely JSON-encode those terms into two fixed GROQ queries: one for lesson topics and one for video chapter/transcript matches.
- The server will execute both queries through the existing read-only Sanity Context `groq_query` MCP tool.
- Video rows will prefer matching chapters and use their filtered transcript chunks only when that video has no chapter match.
- Existing `groundSearchCandidates` will continue validating all IDs, relationships, and exact timestamps against Sanity before returning cards.

This keeps the LLM, Context MCP, private dataset, chapter-first fallback, and final grounding, but the LLM no longer authors arbitrary full GROQ.

## Expected files to touch

- `app/api/search/route.ts`
- `lib/search/prompt.ts`
- `lib/search/schema.ts`
- `lib/search/ground-results.ts` only for the already-approved cancellation signal
- `prompts/fix-search-timeout-and-latency.md` remains historical and is not rewritten

## Requirements

1. Define a Zod schema for 1–12 normalized search terms, each bounded in length and restricted to safe textual content.
2. Ask Gemini only for semantic terms, with temperature zero, bounded output, and minimal thinking.
3. Fall back to deterministic tokens from the validated learner query only if Gemini returns no usable terms; never broaden to an unbounded query.
4. JSON-encode every wildcard pattern before inserting it into fixed GROQ source.
5. Use one fixed lesson query over title, key points, and `pt::text(notes)`.
6. Use one fixed video query that returns only matching chapter start seconds and at most five matching transcript-chunk start seconds per video.
7. Execute both through the Context MCP `groq_query` tool, preferably in parallel under the route cancellation signal.
8. Parse the MCP envelopes with Zod before constructing candidates.
9. Prefer chapter candidates per video; create chunk candidates only when that video's matching chapter list is empty.
10. Preserve the 60-second platform budget, shorter internal deadline, safe timings, request cancellation, MCP cleanup, candidate validation, and final Sanity grounding.
11. Never log learner queries, terms, GROQ, MCP content, model output, transcripts, or credentials.

## Security considerations

- Gemini and Sanity tokens remain server-only.
- The model cannot author arbitrary queries or change projections.
- Search terms are length/count constrained and JSON-encoded before use.
- Context's published-content/type filter remains active.
- Queries return only IDs, relevance metadata, and filtered timestamps—not notes, chapter text, transcript text, or whole arrays.
- Final results still require a successful server-side grounding lookup.

## Acceptance criteria

- No model/tool loop remains in the request path.
- Gemini interpretation completes with minimal thinking and produces only validated search terms.
- Both fixed queries execute successfully through Sanity Context MCP.
- Chapter matches suppress transcript fallback for the same video.
- Cold and warm representative searches return HTTP 200 within the 55-second deadline.
- Lesson and video results survive final Sanity grounding and response validation.
- Invalid, oversized, unconfigured, cancelled, MCP-error, and deadline cases remain sanitized.
- TypeScript, ESLint, and production build pass.

## Checks to run

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. Start the built server and test malformed, oversized, unconfigured where safely possible, and valid requests.
5. Time at least three representative valid queries on cold and warm paths.
6. Confirm live chapter and transcript-fallback cases from returned `matchSource` values.
7. Abort one request and inspect for clean cancellation.
8. Confirm active source contains no model-authored GROQ output schema or MCP tool loop.

## Exact manual test steps

1. Restart Lopsis with the existing Google and Sanity server-only credentials.
2. Open `/search?q=hybrid%20search`.
3. Confirm grounded results appear without a timeout or temporary-unavailable error.
4. Open a lesson card and verify the stored lesson route.
5. Open a video card and verify on-site playback begins at the exact stored second.
6. Run a known chapter-label search and confirm a chapter-backed video result.
7. Run a known transcript-only search and confirm a chunk-backed result.
8. Repeat the searches to verify warm-path timing.
