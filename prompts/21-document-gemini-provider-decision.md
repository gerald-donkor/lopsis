# Document the Gemini provider decision

## Goal

Update the repository-level `AGENTS.md` so future implementation agents consistently use Google Gemini 3.6 Flash for Lopsis AI features and do not restore OpenAI unless the user explicitly changes that decision.

## Skills read

- No project skill is needed for this documentation-only policy update.

## Code and configuration inspected

- `AGENTS.md`, especially the tech stack and fixed decisions sections.
- The current tech stack sentence still requires the Vercel AI SDK with the OpenAI provider.
- The implemented search route and environment template already use `@ai-sdk/google`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_GENERATIVE_AI_MODEL`, and `gemini-3.6-flash`.

## Decisions and assumptions

- Treat Gemini 3.6 Flash as a deliberate project-wide implementation decision, not merely the current search-route default.
- Name the exact stable model ID: `gemini-3.6-flash`.
- Retain the Vercel AI SDK and Sanity Context MCP architecture.
- Explicitly prohibit introducing OpenAI packages, credentials, model IDs, or provider code unless the user later directs a provider change.
- Keep the Google API key server-only and preserve model override support through `GOOGLE_GENERATIVE_AI_MODEL` where appropriate.

## Expected files to touch

- `AGENTS.md`

## Requirements

1. Replace the outdated OpenAI provider requirement in the tech stack with `@ai-sdk/google` and Gemini 3.6 Flash.
2. Add a clear fixed-decision bullet stating that Lopsis uses the stable `gemini-3.6-flash` model.
3. State that future implementations must not reintroduce OpenAI packages, credentials, model IDs, or provider code unless the user explicitly requests a provider change.
4. State that `GOOGLE_GENERATIVE_AI_API_KEY` remains server-only and `GOOGLE_GENERATIVE_AI_MODEL` is the model configuration variable.
5. Avoid changing unrelated architecture, behavior, or workflow instructions.

## Security considerations

- Reinforce that `GOOGLE_GENERATIVE_AI_API_KEY` is server-only.
- Do not place credentials or example secret values in `AGENTS.md`.
- Do not weaken any existing browser/server, MCP, Sanity-token, Clerk, or PostHog boundaries.

## Acceptance criteria

- `AGENTS.md` no longer directs agents to use the OpenAI provider.
- `AGENTS.md` explicitly names `@ai-sdk/google` and `gemini-3.6-flash`.
- `AGENTS.md` explicitly prevents accidental OpenAI reintroduction without a new user instruction.
- The documented environment variables match the current implementation.
- No unrelated files are modified as part of this task.

## Checks to run

1. Search `AGENTS.md` for `OpenAI`, `Gemini`, `@ai-sdk/google`, and the Google environment-variable names.
2. Review the focused `AGENTS.md` diff.
3. Run `git diff --check`.
4. No application type check, lint, or build is required because this changes documentation only.

## Exact manual test steps

1. Open `AGENTS.md`.
2. Read the tech stack section and confirm it specifies the Vercel AI SDK with `@ai-sdk/google` and `gemini-3.6-flash`.
3. Read the fixed decisions section and confirm OpenAI cannot be reintroduced unless the user explicitly requests a provider change.
4. Confirm the Google API key is described as server-only.
