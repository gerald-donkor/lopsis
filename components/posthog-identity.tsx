"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export function PostHogIdentity() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      if (identifiedUserId.current !== userId) {
        posthog.identify(userId);
        identifiedUserId.current = userId;
      }
      return;
    }

    posthog.reset();
    identifiedUserId.current = null;
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
