"use client";

import { useEffect, useRef, useState } from "react";

function Bell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 17.5h13c-1.3-1.5-1.8-3.2-1.8-5.8 0-3.1-1.8-5.4-4.7-5.4s-4.7 2.3-4.7 5.4c0 2.6-.5 4.3-1.8 5.8Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.7 20c.5.6 1.2.9 2.3.9s1.8-.3 2.3-.9M10.5 4.3c.2-.7.7-1.1 1.5-1.1s1.3.4 1.5 1.1" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
    </svg>
  );
}

const ANNOUNCEMENTS = [
  {
    title: "New courses added every week",
    body: "Fresh lessons land across the catalog each week.",
  },
  {
    title: "AI search finds exact video moments",
    body: "Ask in plain English and jump straight to the second.",
  },
  {
    title: "Resume learning from any card",
    body: "Pick up where you left off from home or catalog cards.",
  },
];

/** Presentational notifications popover for the site header bell. */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(ANNOUNCEMENTS.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        bellRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <div className="notifications-root" ref={rootRef}>
      <button
        ref={bellRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notifications-popover"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell />
        {unread > 0 && <span className="notifications-bell-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div
          id="notifications-popover"
          className="notifications-popover"
          role="dialog"
          aria-label="Notifications"
        >
          <h2 ref={headingRef} tabIndex={-1} className="notifications-heading">
            Notifications
          </h2>
          <p className="notifications-subline">You&apos;re all caught up!</p>
          <ul className="notifications-list">
            {ANNOUNCEMENTS.map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="notifications-mark-read"
            onClick={() => {
              setUnread(0);
              setOpen(false);
              bellRef.current?.focus();
            }}
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
