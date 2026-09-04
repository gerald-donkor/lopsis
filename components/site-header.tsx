import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";

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

function Bell({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 17.5h13c-1.3-1.5-1.8-3.2-1.8-5.8 0-3.1-1.8-5.4-4.7-5.4s-4.7 2.3-4.7 5.4c0 2.6-.5 4.3-1.8 5.8Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.7 20c.5.6 1.2.9 2.3.9s1.8-.3 2.3-.9M10.5 4.3c.2-.7.7-1.1 1.5-1.1s1.3.4 1.5 1.1" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
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
        <button type="button" aria-label="Notifications"><Bell /></button>
        <AuthControls />
      </div>
    </header>
  );
}
