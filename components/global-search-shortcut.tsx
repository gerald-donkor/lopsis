"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

function focusAndSelect(id: string): boolean {
  const el = document.getElementById(id);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
    return true;
  }
  return false;
}

function focusAfterNavigation(id: string) {
  if (focusAndSelect(id)) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (focusAndSelect(id) || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 50);
}

/** Global ⌘K / Ctrl+K handler mounted once in the root layout. */
export function GlobalSearchShortcut() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      const source = window.location.pathname;
      posthog.capture("search_shortcut_used", { source });
      if (source === "/") {
        focusAndSelect("learning-search");
      } else if (source.startsWith("/search")) {
        focusAndSelect("results-search");
      } else {
        router.push("/search");
        focusAfterNavigation("results-search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}

export default GlobalSearchShortcut;
