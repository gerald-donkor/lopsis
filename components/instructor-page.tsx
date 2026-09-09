"use client";

import Image from "next/image";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { INSTRUCTOR_BY_SLUG_QUERY_RESULT } from "@/sanity.types";
import { CourseCard } from "@/components/course-card";
import { SiteHeader } from "@/components/site-header";
import { urlFor } from "@/sanity/lib/image";

type Instructor = NonNullable<INSTRUCTOR_BY_SLUG_QUERY_RESULT>;

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || "#";
      return (
        <a href={href} target="_blank" rel="noreferrer noopener">
          {children}
        </a>
      );
    },
  },
};

function ChevronRight() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="m7 4 5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InstructorPage({ instructor }: { instructor: Instructor }) {
  const courses = instructor.courses ?? [];
  const courseCount = courses.length;

  const photoUrl = instructor.photo?.asset
    ? urlFor(instructor.photo).width(480).height(480).fit("crop").auto("format").url()
    : null;
  const blurDataURL = instructor.photo?.asset?.metadata?.lqip ?? undefined;

  return (
    <div className="catalog-shell instructor-shell">
      <div className="catalog-canvas instructor-canvas">
        <SiteHeader />
        <main className="catalog-main instructor-main">
          <nav className="instructor-breadcrumb" aria-label="Breadcrumb">
            <Link href="/courses">All Courses</Link>
            <ChevronRight />
            <span>Instructors</span>
            <ChevronRight />
            <span aria-current="page">{instructor.name}</span>
          </nav>

          <header className="instructor-hero" aria-labelledby="instructor-name">
            <div className="instructor-photo-wrapper">
              <div className="instructor-photo">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={instructor.photo?.alt || `Photo of ${instructor.name}`}
                    fill
                    sizes="(max-width: 680px) 140px, (max-width: 1020px) 180px, 220px"
                    placeholder={blurDataURL ? "blur" : "empty"}
                    blurDataURL={blurDataURL}
                  />
                ) : (
                  <span aria-hidden="true" className="instructor-photo-fallback">
                    {instructor.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="instructor-profile-info">
              <p className="catalog-eyebrow instructor-eyebrow">Instructor Profile</p>
              <h1 id="instructor-name">{instructor.name}</h1>

              {instructor.expertise && instructor.expertise.length > 0 && (
                <ul className="instructor-expertise" aria-label="Areas of expertise">
                  {instructor.expertise.map((skill) => (
                    <li key={skill} className="instructor-expertise-tag">
                      {skill}
                    </li>
                  ))}
                </ul>
              )}

              <div className="instructor-stats-bar">
                <span className="instructor-course-count-badge">
                  {courseCount} {courseCount === 1 ? "course" : "courses"}
                </span>
              </div>

              {instructor.bio && (
                <div className="instructor-bio">
                  <PortableText value={instructor.bio} components={portableTextComponents} />
                </div>
              )}
            </div>
          </header>

          <section className="instructor-courses-section" aria-labelledby="instructor-courses-heading">
            <div className="instructor-courses-heading-row">
              <h2 id="instructor-courses-heading">Courses by {instructor.name}</h2>
              <span className="instructor-courses-count-label">
                {courseCount} {courseCount === 1 ? "course" : "courses"}
              </span>
            </div>

            {courseCount > 0 ? (
              <div className="catalog-grid">
                {courses.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))}
              </div>
            ) : (
              <section className="catalog-empty" aria-labelledby="instructor-empty-heading">
                <h3 id="instructor-empty-heading">No courses published yet</h3>
                <p>
                  {instructor.name} doesn&apos;t have any published courses right now. Check back
                  soon or explore all courses in our catalog.
                </p>
                <Link href="/courses">Explore all courses</Link>
              </section>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
