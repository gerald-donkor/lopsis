import type { ReactNode } from "react";
import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";

type IconProps = { className?: string };

function LopsisMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 34 36" fill="none" aria-hidden="true">
      <path d="M2 3h30L17 33 2 3Z" fill="#f15a32" />
      <path d="M10.2 8.7h13.6L17 22.4 10.2 8.7Z" fill="#fffaf7" />
      <path d="m17 22.4 3.3-6.7h-6.6l3.3 6.7Z" fill="#f15a32" />
    </svg>
  );
}

function ArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

function Search({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.75" />
      <path d="m15.4 15.4 4.8 4.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function Level({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 15v-2.8M6.8 15V9.1M11.1 15V6M15.4 15V2.7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function Clock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.7" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9 5.1v4.2l2.7 1.8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function Modules({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.3 2.3h6.3l3.1 3.1v10.3H4.3V2.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10.6 2.6v3h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Star({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 2.6 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2-4.5-4.4 6.3-.9L12 2.6Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    </svg>
  );
}

function NextMark() {
  return <span className="course-logo course-logo-next">N</span>;
}

function DockerMark() {
  return (
    <span className="course-logo course-logo-docker" aria-hidden="true">
      <svg viewBox="0 0 76 58">
        <g fill="#2496ed" stroke="#0d4f78" strokeWidth="1.2">
          <path d="M9 25h38v8H9zM17 16h8v8h-8zM27 16h8v8h-8zM37 16h8v8h-8zM27 7h8v8h-8zM37 7h8v8h-8zM47 16h8v8h-8z" />
          <path d="M5 33h47c4 0 8-2 11-6 2 2 3 5 1 8-4 10-13 16-27 16H23C13 51 7 45 5 33Z" />
          <path d="M62 24c4-4 8-4 11-2-2 5-6 8-12 8" />
        </g>
        <circle cx="14" cy="37" r="1.5" fill="#fff" />
      </svg>
    </span>
  );
}

function TypeScriptMark() {
  return <span className="course-logo course-logo-typescript">TS</span>;
}

type CourseCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  level: string;
  duration: string;
  modules: string;
  href: string;
};

function CourseCard({ icon, title, description, level, duration, modules, href }: CourseCardProps) {
  return (
    <article className="home-course-card">
      <div className="home-course-logo">{icon}</div>
      <h3><Link href={href}>{title}</Link></h3>
      <p>{description}</p>
      <div className="home-course-meta">
        <span><Level />{level}</span>
        <span><Clock />{duration}</span>
        <span><Modules />{modules}</span>
      </div>
    </article>
  );
}

function BottomGlow() {
  const heights = [50, 88, 123, 157, 106, 73, 39, 27, 42, 68, 113, 156, 93, 66, 105, 118];

  return (
    <div className="home-bottom-glow" aria-hidden="true">
      <div className="home-glow-bars">
        {heights.map((height, index) => <i key={`${height}-${index}`} style={{ height }} />)}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home-shell">
      <div className="home-canvas">
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

        <main>
          <section className="home-hero" aria-labelledby="home-title">
            <p className="home-eyebrow">Intelligent Learning</p>
            <h1 id="home-title">Search your learning<br />in plain English.</h1>
            <p className="home-intro">Lopsis understands what you want to learn and<br className="home-desktop-break" /> finds the exact lessons across all your courses.</p>
            <Link className="home-cta" href="/courses">Explore Courses <ArrowRight /></Link>
            <div className="home-search" role="search">
              <Search />
              <label className="sr-only" htmlFor="learning-search">Search your learning</label>
              <input id="learning-search" type="search" placeholder="Ask anything about your learning..." />
              <kbd>⌘ K</kbd>
            </div>
          </section>

          <section className="home-courses" aria-labelledby="all-courses-title">
            <div className="home-section-heading">
              <h2 id="all-courses-title">All Courses</h2>
              <Link href="/courses">View all courses <ArrowRight /></Link>
            </div>
            <div className="home-course-grid">
              <CourseCard icon={<NextMark />} title="Next.js for Production" description="Build scalable, high-performance web applications with Next.js." level="Intermediate" duration="18h 24m" modules="12 modules" href="/courses/nextjs-for-production" />
              <CourseCard icon={<DockerMark />} title="Docker Essentials" description="Containerize applications and streamline your development workflow." level="Beginner" duration="10h 12m" modules="8 modules" href="/courses/docker-essentials" />
              <CourseCard icon={<TypeScriptMark />} title="TypeScript Deep Dive" description="Go beyond the basics and write safer, more expressive code." level="Intermediate" duration="14h 36m" modules="10 modules" href="/courses/typescript-deep-dive" />
            </div>
            <div className="home-announcement">
              <span />
              <p><Star />New courses and lessons added every week.</p>
              <span />
            </div>
          </section>
        </main>

        <BottomGlow />
      </div>
    </div>
  );
}
