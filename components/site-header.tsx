import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import { NotificationsPopover } from "@/components/notifications-popover";

type IconProps = { className?: string };

export function LopsisMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 34 36" fill="none" aria-hidden="true">
      <path d="M2 3h30L17 33 2 3Z" fill="#f15a32" />
      <path d="M10.2 8.7h13.6L17 22.4 10.2 8.7Z" fill="#fffaf7" />
      <path d="m17 22.4 3.3-6.7h-6.6l3.3 6.7Z" fill="#f15a32" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="home-header">
      <div className="home-header-left">
        <Link className="home-brand" href="/" aria-label="Lopsis home">
          <LopsisMark />
          <span>Lopsis</span>
        </Link>
        <nav className="home-nav" aria-label="Primary navigation">
          <Link href="/courses">Courses</Link>
          <Link href="/my-learning">My Learning</Link>
        </nav>
      </div>
      <div className="home-account">
        <NotificationsPopover />
        <AuthControls />
      </div>
    </header>
  );
}
