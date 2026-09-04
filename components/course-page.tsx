"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { COURSE_BY_SLUG_QUERY_RESULT } from "@/sanity.types";
import { CourseCurriculum, type CurriculumModule } from "@/components/course-curriculum";
import { SiteHeader } from "@/components/site-header";
import { urlFor } from "@/sanity/lib/image";

type Course = NonNullable<COURSE_BY_SLUG_QUERY_RESULT>;
type IconProps = { className?: string };

function ArrowRight({ className }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronRight() {
  return <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m7 4 5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Bookmark() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 3.5h11v17L12 17l-5.5 3.5v-17Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

function LevelIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 17v-3M7.7 17v-7M12.3 17V6M17 17V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.4" /><path d="M10 5.8v4.5l3 1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function DocumentIcon() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 2.5h7l4 4V17h-11V2.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /><path d="M11.5 2.8v4h3.7" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /></svg>;
}

function StudentsIcon() {
  return <svg viewBox="0 0 22 20" fill="none" aria-hidden="true"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.35" /><path d="M2.7 16c.5-3 2.3-4.7 5.3-4.7s4.8 1.7 5.3 4.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /><path d="M14.5 3.7a2.7 2.7 0 0 1 0 5.2M15.5 11.2c2.3.4 3.7 2 4 4.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>;
}

const outcomePaths: Record<string, React.ReactNode> = {
  layers: <><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" /></>,
  workflow: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.5 6h7M7.7 8l3 7.5M16.3 8l-3 7.5" /></>,
  gauge: <><path d="M4.2 19a9 9 0 1 1 15.6 0" /><path d="m12 15 4-6M6.3 12H4m16 0h-2.3M12 5V3" /></>,
  rocket: <><path d="M14.5 4.2c2.1-1.5 4.1-1.3 5.3-1.1.2 1.2.4 3.2-1.1 5.3l-6.2 6.2-3.8-3.8 5.8-6.6Z" /><circle cx="15.7" cy="7.2" r="1.5" /><path d="M8.2 9.5 4.5 10.7 3 15l4.1-1M13.9 14.1 13 18l-4.3 1.5 1.2-3.8M6 18l-2 2" /></>,
  shield: <><path d="M12 3 20 6v5c0 5-3.1 8.2-8 10-4.9-1.8-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  puzzle: <path d="M4 5h5a3 3 0 1 1 6 0h5v5a3 3 0 1 0 0 6v5h-5a3 3 0 1 0-6 0H4v-5a3 3 0 1 1 0-6V5Z" />,
  code: <><path d="m8.5 6-5 6 5 6M15.5 6l5 6-5 6M13.5 4l-3 16" /></>,
  sparkles: <><path d="M12 2.5c.7 4.2 2.8 6.3 7 7-4.2.7-6.3 2.8-7 7-.7-4.2-2.8-6.3-7-7 4.2-.7 6.3-2.8 7-7Z" /><path d="M19 15.5c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z" /></>,
};

function OutcomeIcon({ token }: { token: string }) {
  const paths = outcomePaths[token];
  if (!paths) return <span className="course-outcome-fallback" aria-label={`${token} icon`}>{token.slice(0, 1).toUpperCase()}</span>;
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths && <g stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">{paths}</g>}</svg>;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${minutes}m`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function formatLevel(level: Course["level"]) {
  return level === "all-levels" ? "All levels" : level.charAt(0).toUpperCase() + level.slice(1);
}

function formatStudents(count: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count).toLowerCase();
}

function getCurriculum(course: Course) {
  return (course.modules ?? []).map((module, moduleIndex): CurriculumModule => {
    const lessons = (module.lessons ?? []).filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson?.slug));
    const durationSeconds = lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0);
    return {
      key: module._key || `module-${moduleIndex}`,
      title: module.title,
      summary: module.summary,
      duration: formatDuration(durationSeconds),
      lessons: lessons.map((lesson) => ({
        id: lesson._id,
        title: lesson.title,
        slug: lesson.slug,
        duration: formatDuration(lesson.durationSeconds ?? 0),
      })),
    };
  });
}

export function CoursePage({ course }: { course: Course }) {
  useEffect(() => {
    posthog.capture("course_viewed", { course_slug: course.slug, course_title: course.title });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.slug]);

  const modules = getCurriculum(course);
  const totalSeconds = (course.modules ?? []).flatMap((module) => module.lessons ?? []).reduce((sum, lesson) => sum + (lesson?.durationSeconds ?? 0), 0);
  const firstLesson = modules.flatMap((module) => module.lessons)[0];
  const firstLessonHref = firstLesson ? `/lessons/${firstLesson.slug}` : "#course-content";
  const imageSource = course.coverImage?.asset ? urlFor(course.coverImage).width(720).height(820).fit("crop").auto("format").url() : null;
  const blurDataURL = course.coverImage?.asset?.metadata?.lqip ?? undefined;

  return (
    <div className="course-shell">
      <div className="course-canvas">
        <SiteHeader />
        <main className="course-main">
          <nav className="course-breadcrumb" aria-label="Breadcrumb">
            <Link href="/courses">All Courses</Link><ChevronRight /><span aria-current="page">{course.title}</span>
          </nav>

          <section className="course-hero" aria-labelledby="course-title">
            <div className="course-cover">
              {imageSource ? (
                <Image src={imageSource} alt={course.coverImage?.alt || `Cover image for ${course.title}`} fill sizes="(max-width: 700px) calc(100vw - 48px), 280px" placeholder={blurDataURL ? "blur" : "empty"} blurDataURL={blurDataURL} />
              ) : <span aria-hidden="true">{course.title.slice(0, 1)}</span>}
            </div>
            <div className="course-hero-copy">
              {course.popular && <span className="course-popular">Popular</span>}
              <h1 id="course-title">{course.title}</h1>
              <p>{course.summary}</p>
              <div className="course-meta" aria-label="Course details">
                <span><LevelIcon />{formatLevel(course.level)}</span>
                <span><ClockIcon />{formatDuration(totalSeconds)}</span>
                <span><DocumentIcon />{modules.length} {modules.length === 1 ? "module" : "modules"}</span>
                <span><StudentsIcon />{formatStudents(course.studentCount)} students</span>
              </div>
              <div className="course-actions">
                <Link className="course-primary-action" href={firstLessonHref} onClick={() => posthog.capture("course_started", { course_slug: course.slug, course_title: course.title })}>Continue Learning <ArrowRight /></Link>
                <button className="course-bookmark" type="button" aria-label="Bookmark course (not saved)" onClick={() => posthog.capture("course_bookmarked", { course_slug: course.slug, course_title: course.title })}><Bookmark /> Bookmark</button>
              </div>
            </div>
          </section>

          {course.learningOutcomes?.length > 0 && (
            <section className="course-outcomes" aria-labelledby="course-outcomes-title">
              <h2 id="course-outcomes-title">What you’ll learn</h2>
              <div className="course-outcome-grid">
                {course.learningOutcomes.map((outcome) => (
                  <article key={outcome._key}>
                    <OutcomeIcon token={outcome.icon} />
                    <div><h3>{outcome.title}</h3><p>{outcome.description}</p></div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="course-content" id="course-content" aria-labelledby="course-content-title">
            <div className="course-content-heading">
              <h2 id="course-content-title">Course Content</h2>
              <p>{modules.length} {modules.length === 1 ? "module" : "modules"}<span aria-hidden="true">•</span>{formatDuration(totalSeconds)}</p>
            </div>
            <CourseCurriculum modules={modules} />
          </section>
        </main>

        <div className="course-bottom-glow" aria-hidden="true" />
        <aside className="course-progress-strip" aria-label="Course progress">
          <div className="course-progress-copy"><span>Your Progress</span><strong>0% <em>complete</em></strong></div>
          <div className="course-progress-track" role="progressbar" aria-label="Course progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span /></div>
          <Link className="course-progress-action" href={firstLessonHref} onClick={() => posthog.capture("course_started", { course_slug: course.slug, course_title: course.title })}>Continue Learning <ArrowRight /></Link>
        </aside>
      </div>
    </div>
  );
}
