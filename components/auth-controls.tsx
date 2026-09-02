"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthControls() {
  return (
    <div className="home-auth-controls">
      <Show when="signed-out">
        <SignInButton>
          <button className="home-auth-link" type="button">Sign in</button>
        </SignInButton>
        <SignUpButton>
          <button className="home-auth-button" type="button">Sign up</button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={{ elements: { rootBox: "home-user-button" } }} />
      </Show>
    </div>
  );
}
