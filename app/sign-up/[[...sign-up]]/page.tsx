"use client";

import { useEffect } from "react";
import { SignUp } from "@clerk/nextjs";
import posthog from "posthog-js";

export default function SignUpPage() {
  useEffect(() => {
    posthog.capture("sign_up_viewed");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
