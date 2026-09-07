# Match Header Authentication Actions to Reference

## Goal

Restyle the signed-out Lopsis header controls to match the red-circled area of the supplied reference: a restrained `Sign in` text action followed by a compact orange, rounded `Sign up` button.

## Guidance read

- `AGENTS.md`: required prompt/approval workflow, Lopsis naming, visual-reference precedence, and verification requirements.
- Local Next.js 16.3.3 App Router guides for Server and Client Components and linking/navigation.

## Code and configuration inspected

- `components/auth-controls.tsx`: uses Clerk `Show`, `SignInButton`, and `SignUpButton` wrappers around native buttons. It also renders the Clerk `UserButton` for authenticated users.
- `components/home-page.tsx`: places `AuthControls` in the header after the notification control.
- `app/globals.css`: defines the current header, account area, auth control, hover, user-button, and responsive styles.
- `package.json`: confirms Next.js 16.3.3 and Clerk 7.8.4.

## Decisions and assumptions

- The supplied image is the visual source of truth. Its legacy Vertex branding is not copied; the product remains Lopsis.
- Keep the existing Clerk authentication behavior, notification control, header structure, routes, and signed-in user menu unchanged.
- Adjust only the auth-control CSS necessary to reproduce the reference's desktop spacing, typography, sign-in color/treatment, signup dimensions, radius, orange fill, border, and restrained shadow. Preserve visible keyboard focus and a compatible compact mobile layout.
- This is presentation-only work: no data, authentication configuration, environment variables, tokens, or server/client boundaries change.

## Files expected to change

- `app/globals.css`
- `prompts/match-header-auth-actions-reference.md`

## Requirements

1. Show `Sign in` first as a compact text action with the reference's muted orange/brown color.
2. Show `Sign up` second as a compact orange rounded button with white text.
3. Match the reference's hierarchy, spacing, and proportions at desktop widths without changing surrounding header controls.
4. Preserve Clerk's existing sign-in/sign-up invocation and the authenticated `UserButton` state.
5. Keep controls usable and legible below the existing mobile breakpoint.

## Security considerations

- Do not modify Clerk keys, session behavior, redirects, middleware, or route protection.
- Do not replace Clerk components with custom client-side authentication handling.

## Acceptance criteria

- When signed out, the header matches the reference's two-action arrangement in the supplied desktop image.
- Clicking either action opens the existing Clerk flow.
- When signed in, the existing user menu remains unchanged.
- Focus, hover, and mobile behavior remain usable.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- Start `npm run dev` and visually verify the signed-out header at `http://localhost:3000`.

## Exact manual test steps

1. Run `npm run dev` and visit `http://localhost:3000` while signed out.
2. Compare `Sign in` and `Sign up` with the red-circled reference area.
3. Select each action and confirm its Clerk flow opens.
4. Sign in and confirm the existing user menu replaces the two actions.
5. View the page at a width below 580px and confirm the actions remain readable and tappable.
