"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { COURSES_QUERY_RESULT } from "@/sanity.types";
import { SiteHeader } from "@/components/site-header";
import { urlFor } from "@/sanity/lib/image";

type IconProps = { className?: string };

function ArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

type Course = COURSES_QUERY_RESULT[number];

function formatDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${minutes}m`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatLevel(level: Course["level"]) {
  return level === "all-levels" ? "All levels" : level.charAt(0).toUpperCase() + level.slice(1);
}

function NextMark() {
  return <span className="course-logo course-logo-next" aria-label="Next.js">N</span>;
}

function DockerMark() {
  return (
    <span className="course-logo course-logo-docker" aria-label="Docker">
      <svg viewBox="0 0 76 58" width="74" height="57" aria-hidden="true">
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
  return <span className="course-logo course-logo-typescript" aria-label="TypeScript">TS</span>;
}

function PythonMark() {
  return (
    <span className="course-logo course-logo-python" aria-label="Python">
      <svg viewBox="0 0 110 110" width="46" height="46" fill="none" aria-hidden="true">
        <path d="M54.5 10c-24.1 0-22.6 10.4-22.6 10.4l.03 10.8h23.1v3.3H22.5S10 33.1 10 57.1c0 24.1 10.9 23.3 10.9 23.3h6.5v-9.2s-.4-10.9 10.7-10.9h23.2v-16s.3-14.3-16.8-14.3H54.5zm-6.2 6.6c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" fill="#387eb8" />
        <path d="M55.5 100c24.1 0 22.6-10.4 22.6-10.4l-.03-10.8H55v-3.3h32.5s12.5 1.4 12.5-22.6c0-24.1-10.9-23.3-10.9-23.3h-6.5v9.2s.4 10.9-10.7 10.9H49.2v16s-.3 14.3 16.8 14.3h-10.5zm6.2-6.6c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="#ffe052" />
      </svg>
    </span>
  );
}

function AiMark() {
  return (
    <span className="course-logo course-logo-ai" aria-label="Artificial Intelligence">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        <circle cx="19" cy="5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="5" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function ReactMark() {
  return (
    <span className="course-logo course-logo-react" aria-label="React">
      <svg viewBox="-11.5 -10.23174 23 20.46348" width="44" height="44" fill="none" stroke="#00d8ff" strokeWidth="1" aria-hidden="true">
        <circle cx="0" cy="0" r="2.05" fill="#00d8ff" stroke="none" />
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </svg>
    </span>
  );
}

function PostgresMark() {
  return (
    <span className="course-logo course-logo-postgres" aria-label="PostgreSQL">
      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    </span>
  );
}

function SystemDesignMark() {
  return (
    <span className="course-logo course-logo-system" aria-label="System Design">
      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="7" height="7" rx="1.5" />
        <rect x="15" y="3" width="7" height="7" rx="1.5" />
        <rect x="9" y="14" width="7" height="7" rx="1.5" />
        <path d="M5.5 10v2a2 2 0 0 0 2 2h5M18.5 10v2a2 2 0 0 1-2 2h-5" />
      </svg>
    </span>
  );
}

function SecurityMark() {
  return (
    <span className="course-logo course-logo-security" aria-label="Web Security">
      <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </span>
  );
}

function FallbackMark({ title }: { title: string }) {
  const monogram = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span className="course-logo course-logo-fallback" aria-label={title}>
      {monogram}
    </span>
  );
}

function CourseIcon({ course }: { course: Course }) {
  if (course.icon?.asset) {
    const iconUrl = urlFor(course.icon).width(146).height(148).fit("crop").auto("format").url();
    return (
      <span className="course-logo">
        <Image className="course-logo-image" src={iconUrl} alt={course.icon?.alt || `${course.title} icon`} fill sizes="73px" />
      </span>
    );
  }

  const key = `${course.slug} ${course.title}`.toLowerCase();
  if (key.includes("next")) return <NextMark />;
  if (key.includes("docker") || key.includes("devops") || key.includes("kubernetes")) return <DockerMark />;
  if (key.includes("typescript")) return <TypeScriptMark />;
  if (key.includes("python")) return <PythonMark />;
  if (key.includes("ai") || key.includes("llm") || key.includes("rag") || key.includes("retrieval")) return <AiMark />;
  if (key.includes("react")) return <ReactMark />;
  if (key.includes("postgres") || key.includes("database") || key.includes("sql")) return <PostgresMark />;
  if (key.includes("system-design") || key.includes("system design") || key.includes("foundation")) return <SystemDesignMark />;
  if (key.includes("security")) return <SecurityMark />;

  return <FallbackMark title={course.title} />;
}

function CourseCard({ course }: { course: Course }) {
  const moduleLabel = `${course.moduleCount} ${course.moduleCount === 1 ? "module" : "modules"}`;

  return (
    <article className="home-course-card">
      <div className="home-course-logo"><CourseIcon course={course} /></div>
      <h3><Link href={`/courses/${course.slug}`} onClick={() => posthog.capture("home_course_clicked", { course_slug: course.slug, course_title: course.title })}>{course.title}</Link></h3>
      <p>{course.summary}</p>
      <div className="home-course-meta">
        <span><Level />{formatLevel(course.level)}</span>
        <span><Clock />{formatDuration(course.durationSeconds)}</span>
        <span><Modules />{moduleLabel}</span>
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

export default function HomePage({ courses }: { courses: COURSES_QUERY_RESULT }) {
  return (
    <div className="home-shell">
      <div className="home-canvas">
        <SiteHeader />

        <main>
          <section className="home-hero" aria-labelledby="home-title">
            <p className="home-eyebrow">Intelligent Learning</p>
            <h1 id="home-title">Search your learning<br />in plain English.</h1>
            <p className="home-intro">Lopsis understands what you want to learn and<br className="home-desktop-break" /> finds the exact lessons across all your courses.</p>
            <Link className="home-cta" href="/courses" onClick={() => posthog.capture("home_cta_clicked")}>Explore Courses <ArrowRight /></Link>
            <form className="home-search" role="search" action="/search">
              <Search />
              <label className="sr-only" htmlFor="learning-search">Search your learning</label>
              <input id="learning-search" name="q" type="search" maxLength={240} required placeholder="Ask anything about your learning..." onFocus={() => posthog.capture("search_focused")} />
              <kbd>⌘ K</kbd>
            </form>
          </section>

          <section className="home-courses" aria-labelledby="all-courses-title">
            <div className="home-section-heading">
              <h2 id="all-courses-title">All Courses</h2>
              <Link href="/courses">View all courses <ArrowRight /></Link>
            </div>
            <div className="home-course-grid">
              {courses.length > 0 ? courses.map((course) => <CourseCard key={course._id} course={course} />) : (
                <p className="home-course-empty">No courses are available yet. <Link href="/courses">Browse the catalog</Link> as new learning paths are published.</p>
              )}
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
