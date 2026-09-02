# Restyle Homepage Authentication Actions

## Goal

Make the signed-out homepage account actions match the supplied reference: a compact text-only `Sign in` link followed by a compact orange rounded `Sign up` button. Preserve the existing Clerk authentication behavior and the signed-in `UserButton` state.

## Guidance read

- `AGENTS.md`, including the required prompt/approval workflow, Lopsis naming, visual-reference precedence, and verification rules.
- Local Next.js 16.3.3 App Router guide for linking and navigating. Existing navigation will remain through Clerk's button wrappers, so no route or navigation behavior changes are needed.
- `clerk-custom-ui` skill: this app uses the current v7 Clerk SDK, and the existing pre-built `SignInButton`, `SignUpButton`, and `Show` composition is the appropriate lightweight custom-UI pattern. No custom Clerk flow or global theme is required.

## Code and configuration inspected

- `components/auth-controls.tsx`: signed-out users render `SignInButton` and `SignUpButton` around native buttons; signed-in users render Clerk's `UserButton`.
- `components/home-page.tsx`: the account controls follow the notification icon in the existing Lopsis header.
- `app/globals.css`: current `.home-auth-*` rules use 38px controls with oversized padding, while the reference uses a smaller, more compact action pair.
- `package.json`: uses Next.js 16.3.3 and `@clerk/nextjs` 7.8.4.
- Working tree: contains pre-existing authentication-related changes; this change will be limited to the auth control styles.

## Decisions and assumptions

- Image #2 is the source of truth for the signed-out account actions. Its legacy `Vertex` name is not copied; all existing Lopsis branding remains unchanged.
- Do not change the notification icon, header layout, Clerk redirects, modal behavior, or signed-in user control.
- Tighten only `.home-auth-controls`, `.home-auth-link`, and `.home-auth-button` desktop styles to align their dimensions, type scale, spacing, color, border radius, and orange button treatment with the reference. Retain the existing mobile overrides unless the desktop changes require a small compatible adjustment.
- CSS-only changes introduce no data, route, token, or browser/server-boundary changes.

## Files expected to change

- `app/globals.css`
- `prompts/restyle-home-auth-actions.md` (this record)

## Requirements

1. Signed-out controls visually read as `Sign in` text followed by an orange `Sign up` button on one line at desktop widths.
2. Match the compact reference proportions without affecting the Lopsis logo, navigation, or notification control.
3. Keep keyboard focus visible and preserve sensible hover feedback.
4. Keep the existing Clerk components and signed-in `UserButton` unchanged.
5. Preserve the responsive homepage behavior.

## Security considerations

- Do not change Clerk keys, environment configuration, session handling, redirects, or route protection.
- Do not replace Clerk's authentication components with client-managed auth logic.

## Acceptance criteria

- At the supplied desktop viewport, the signed-out header controls match Image #2's compact layout and hierarchy.
- Selecting either action still opens its existing Clerk authentication flow.
- A signed-in user still sees the unchanged Clerk user menu.
- The home page retains a clean responsive header at mobile widths.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- Start `npm run dev` and visually verify the signed-out header at `http://localhost:3000`.

## Exact manual test steps

1. Run `npm run dev` and open `http://localhost:3000` while signed out.
2. Compare the header's `Sign in` and `Sign up` controls with Image #2: text link first, compact orange button second.
3. Select each action and confirm its Clerk flow still opens.
4. Sign in and verify that the account pair is replaced by the existing user menu.
5. Reduce the browser width below 580px and confirm the header controls remain readable and tappable.
