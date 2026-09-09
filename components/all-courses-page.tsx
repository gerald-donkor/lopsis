"use client";

import Link from "next/link";
import type { COURSES_QUERY_RESULT } from "@/sanity.types";
import { CourseCard } from "@/components/course-card";
import { SiteHeader } from "@/components/site-header";

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
