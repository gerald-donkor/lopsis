import Image from "next/image";
import Link from "next/link";
import type { COURSES_QUERY_RESULT } from "@/sanity.types";
import { SiteHeader } from "@/components/site-header";
import { urlFor } from "@/sanity/lib/image";

type Course = COURSES_QUERY_RESULT[number];

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDuration(seconds: number | null | undefined) {
  const minutes = Math.max(0, Math.round((seconds ?? 0) / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) return `${minutes}m`;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatLevel(level: Course["level"] | null | undefined) {
  if (!level) return null;
  if (level === "all-levels") return "All levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function CourseCard({ course }: { course: Course }) {
  const href = `/courses/${course.slug}`;
  const imageSource = course.coverImage?.asset
    ? urlFor(course.coverImage).width(900).height(560).fit("crop").auto("format").url()
    : null;
  const blurDataURL = course.coverImage?.asset?.metadata?.lqip ?? undefined;
  const level = formatLevel(course.level);
  const moduleCount = course.moduleCount ?? 0;

  return (
    <article className="catalog-card">
      <Link className="catalog-card-cover" href={href} aria-label={`View ${course.title}`}>
        {imageSource ? (
          <Image
            src={imageSource}
            alt={course.coverImage?.alt || `Cover image for ${course.title}`}
            fill
            sizes="(max-width: 680px) calc(100vw - 40px), (max-width: 1020px) calc(50vw - 44px), 390px"
            placeholder={blurDataURL ? "blur" : "empty"}
            blurDataURL={blurDataURL}
          />
        ) : (
          <span aria-hidden="true">{course.title.slice(0, 1).toUpperCase()}</span>
        )}
      </Link>

      <div className="catalog-card-body">
        <div className="catalog-card-context">
          {course.category?.title && <span>{course.category.title}</span>}
          {course.instructor?.name && <span>By {course.instructor.name}</span>}
        </div>
        <h2><Link href={href}>{course.title}</Link></h2>
        {course.summary && <p>{course.summary}</p>}
        <div className="catalog-card-footer">
          <div className="catalog-card-meta" aria-label="Course details">
            {level && <span>{level}</span>}
            <span>{formatDuration(course.durationSeconds)}</span>
            <span>{moduleCount} {moduleCount === 1 ? "module" : "modules"}</span>
          </div>
          <Link className="catalog-card-action" href={href} aria-label={`View course: ${course.title}`}>
            View course <ArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AllCoursesPage({ courses }: { courses: COURSES_QUERY_RESULT }) {
  const courseCount = courses.length;

  return (
    <div className="catalog-shell">
      <div className="catalog-canvas">
        <SiteHeader />
        <main className="catalog-main">
          <header className="catalog-heading">
            <p className="catalog-eyebrow">Course catalog</p>
            <h1>All Courses</h1>
            <p>Explore practical courses designed to help you build durable, real-world skills.</p>
            <span>{courseCount} {courseCount === 1 ? "course" : "courses"} available</span>
          </header>

          {courseCount > 0 ? (
            <div className="catalog-grid">
              {courses.map((course) => <CourseCard key={course._id} course={course} />)}
            </div>
          ) : (
            <section className="catalog-empty" aria-labelledby="catalog-empty-title">
              <h2 id="catalog-empty-title">Courses are on the way</h2>
              <p>There are no published courses available yet. Check back soon for new learning paths.</p>
              <Link href="/">Return home</Link>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
