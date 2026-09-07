# Add Clerk Authentication to Lopsis

## Goal

Connect this existing Lopsis Next.js application to Clerk application `app_3ImR2YcQUffLplV19QtFTsLgqAS` using the Clerk CLI. Add polished, visible account controls to the existing homepage header: sign-in and sign-up actions for signed-out visitors, and a Clerk user menu for signed-in learners.

## Skills and guidance read

- `AGENTS.md` project rules, especially the required prompt/approval loop, Lopsis naming, public browsing policy, and server-only secret policy.
- `clerk`, `clerk-cli`, and `clerk-setup` skills for CLI-driven initialization, configuration safety, and Next.js SDK setup.
- `clerk-nextjs-patterns` plus its public-first proxy strategy reference for current Clerk SDK patterns.
- Local Next.js 16.3.3 App Router documentation for Server/Client boundaries and `proxy.ts`. Next 16 deprecates `middleware.ts` in favor of the root-level `proxy.ts` convention.

## Code and configuration inspected

- `package.json`: existing npm-based Next.js 16.3.3 / React 19.2.8 application; it has no Clerk or competing authentication dependency.
- `app/layout.tsx`: root layout currently renders `<body>{children}</body>` and is the right location for `ClerkProvider` inside the body.
- `components/home-page.tsx`: existing public Lopsis home page includes a header with Courses and My Learning navigation, a notifications icon button, and a static placeholder avatar.
- `app/globals.css`: existing visual styling for the header and account area.
- `next.config.ts`: no custom routing/proxy configuration.
- No root `components.json`, `proxy.ts`, `middleware.ts`, or committed environment template exists.

## Decisions and assumptions

- This is an existing Next.js project, not an empty directory; use its `package-lock.json` signal and let `clerk init` detect the framework and npm package manager.
- Use the supplied Clerk app identifier exactly: `clerk init --app app_3ImR2YcQUffLplV19QtFTsLgqAS`.
- Follow the requested CLI sequence: check/install/update the CLI, immediately authenticate with `clerk auth login`, then run `clerk init`.
- Run CLI account, browser, keychain, and network operations with host access when required. Do not print or read environment files; initialization may safely materialize keys locally, but their contents must remain undisclosed.
- Keep all current site pages public. Clerk is installed and its proxy observes application/API traffic, but no route is gated until a private learner feature is implemented.
- Use Clerk’s current `@clerk/nextjs` components. Replace only the static avatar area with a small client-side account-controls component that presents sign-in and sign-up controls when signed out and a `UserButton` when signed in. Keep the rest of the designed header unchanged.
- The app has no shadcn `components.json`, so do not add `@clerk/ui` or its shadcn theme.
- Create `proxy.ts`, not deprecated `middleware.ts`. Its matcher excludes static assets and includes API/TRPC coverage, plus the Clerk auto-proxy route exactly once after the API/TRPC matcher: `'/__clerk/:path*'`.
- Add a committed `.env.example` containing only the Clerk variable names and safe blank placeholders; never include real keys.

## Files expected to change

- `package.json` and `package-lock.json` from installing `@clerk/nextjs` through Clerk CLI.
- `.env.local` or the framework-selected local env file, created/updated by Clerk CLI and deliberately not inspected or committed.
- `app/layout.tsx` to render `ClerkProvider` inside `<body>`.
- `proxy.ts` for the Next.js 16 Clerk proxy and matcher.
- `components/home-page.tsx` to replace the static avatar with an auth-controls component.
- `components/auth-controls.tsx` (new) to isolate the Clerk client components from the otherwise presentational home page.
- `app/globals.css` only if small styling hooks are needed to preserve the existing Lopsis header presentation.
- `.env.example` (new) with blank `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` entries.
- `prompts/add-clerk-authentication.md` (this implementation record).

## Requirements

1. From the project root, run `command -v clerk && clerk --version`.
2. If present, update the CLI with `clerk update --yes`; if absent, install it with `npm install -g clerk`.
3. Immediately run `clerk auth login` and pause if the browser-based login requires the user to finish it.
4. Run `clerk init --app app_3ImR2YcQUffLplV19QtFTsLgqAS` after authentication. Do not pass framework or package-manager overrides to this existing project.
5. If CLI framework scaffolding is incomplete, use the official Clerk Next.js quickstart, preserving the same security and UI requirements.
6. Ensure the root layout places `ClerkProvider` inside `<body>`, never around `<html>`.
7. Configure a root `proxy.ts` appropriate for Next.js 16. Include API/TRPC matching and add `'/__clerk/:path*'` once after it. Do not introduce the deprecated `middleware.ts` convention.
8. Make clear signed-out and signed-in account states visible in the existing homepage navigation:
   - signed out: sign-in and sign-up actions;
   - signed in: `UserButton` profile control.
9. Keep course browsing and the homepage public. Do not add auth gating or client-side secret access.
10. Run `clerk doctor`, then run the project type check, lint, production build, and development server verification. Resolve integration errors the checks surface.

## Security considerations

- `CLERK_SECRET_KEY` must never be imported into a Client Component, rendered into HTML, logged, or committed.
- Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is browser-safe.
- Do not read or print existing `.env*` contents; report missing configuration by variable name only.
- Proxy coverage is defense in depth, not a replacement for server-side authorization when future learner progress writes or private routes are added.
- Any future server call to `auth()` must use `await auth()` with an import from `@clerk/nextjs/server`.

## Acceptance criteria

- The repository is linked to Clerk application `app_3ImR2YcQUffLplV19QtFTsLgqAS` by the CLI without exposing credential values.
- `@clerk/nextjs` is installed and the app has a provider inside the root `<body>`.
- A Next.js 16 `proxy.ts` exists with a correct Clerk matcher and exactly one `'/__clerk/:path*'` entry placed after `'/ (api|trpc)(.*)'` (without the accidental space in actual code).
- Signed-out visitors see both sign-in and sign-up actions in the Lopsis header.
- After authentication, the header displays the Clerk `UserButton` instead of the static placeholder avatar.
- Public Lopsis pages remain accessible without a session.
- No secret environment value is printed, bundled, or committed; `.env.example` contains names only.
- `clerk doctor`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` complete successfully.

## Checks to run

- `clerk doctor`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev`, then verify the public homepage returns HTTP 200.

## Exact manual test steps

1. Run `npm run dev` from the repository root and open `http://localhost:3000`.
2. While signed out, verify the Lopsis header has clear sign-in and sign-up actions, and the home page remains publicly visible.
3. Select Sign up, create the first Clerk test user, then confirm the flow returns to Lopsis with a profile icon in the header.
4. Open the profile icon and verify the Clerk user menu appears; verify Sign out returns the header to the sign-in/sign-up state.
5. If Clerk displays a “Configure your application” callout, select it and complete its setup prompt.
6. Visit a static asset and an API path if present to confirm the proxy does not block normal site resources.
