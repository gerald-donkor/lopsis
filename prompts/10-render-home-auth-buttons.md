# Render Homepage Authentication Buttons

## Goal

Render the signed-out Lopsis homepage `Sign in` and `Sign up` controls with their intended text-link and orange-button treatments, without changing Clerk authentication behavior.

## Guidance read

- `AGENTS.md`: required prompt-and-approval workflow, Lopsis naming, server/client boundaries, and validation requirements.
- `clerk`, `clerk-nextjs-patterns`, and `clerk-custom-ui` skills: this project uses the current Clerk v7 SDK; retain the built-in `Show`, `SignInButton`, `SignUpButton`, and `UserButton` composition.
- Next.js 16.3.3 App Router linking and navigation guide: retain the existing component boundaries and Clerk-driven navigation.

## Code and configuration inspected

- `components/auth-controls.tsx`: renders Clerk sign-in and sign-up wrappers around styled native buttons when signed out, and a `UserButton` when signed in.
- `components/home-page.tsx`: places these controls in the homepage header's `.home-account` area.
- `app/globals.css`: defines the intended `.home-auth-link` and `.home-auth-button` styles, but its broader `.home-account button` selector has higher specificity and overrides critical properties such as dimensions, border, and background.
- `package.json`: confirms Next.js 16.3.3 and `@clerk/nextjs` 7.8.4.

## Decisions and assumptions

- The issue is CSS selector specificity, not a Clerk routing or configuration issue.
- Narrow the notification-button selector so it affects only the notification button, or equivalently give the auth rules appropriately scoped precedence. Prefer the smallest semantic selector adjustment.
- Preserve the existing text, order, hover and focus states, responsive sizing, Clerk wrappers, authenticated state, routes, keys, and middleware.

## Files expected to change

- `app/globals.css`
- `prompts/render-home-auth-buttons.md`

## Requirements

1. `Sign in` renders as its existing compact text action.
2. `Sign up` renders as its existing compact orange rounded button with white text.
3. The notification icon retains its circular 31px button treatment.
4. Auth controls remain keyboard accessible and retain their existing hover/focus behavior.
5. The signed-in Clerk `UserButton` and mobile layout remain unchanged.

## Security considerations

- Do not change Clerk keys, redirects, session handling, middleware, route protection, or server/client boundaries.
- Do not replace Clerk-provided authentication components with custom auth logic.

## Acceptance criteria

- While signed out, both header actions display their intended styles rather than the notification icon's styles.
- Selecting either action continues to invoke its existing Clerk flow.
- The notification control and signed-in user menu render as before.
- The compact mobile header remains usable.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Start `npm run dev` and visually inspect the signed-out homepage at `http://localhost:3000`.

## Exact manual test steps

1. Start the app with `npm run dev` and open `http://localhost:3000` while signed out.
2. Confirm `Sign in` is text-only and `Sign up` is an orange rounded button.
3. Confirm the bell still displays as a circular icon button.
4. Select each auth action and confirm its current Clerk flow opens.
5. Sign in, then verify the header displays the existing user menu.
6. Reduce the viewport below 580px and confirm all header controls remain visible and tappable.
