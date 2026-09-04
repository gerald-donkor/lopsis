"use client";

import { useEffect } from "react";
import { SignIn } from "@clerk/nextjs";
import posthog from "posthog-js";

export default function SignInPage() {
  useEffect(() => {
    posthog.capture("sign_in_viewed");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
