"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { COURSES_QUERY_RESULT, INSTRUCTOR_BY_SLUG_QUERY_RESULT } from "@/sanity.types";
import { getCourseResumeHref, useLearnerProgress } from "@/lib/progress/use-learner-progress";
import { urlFor } from "@/sanity/lib/image";

export type CourseCardData =
  | COURSES_QUERY_RESULT[number]
  | NonNullable<INSTRUCTOR_BY_SLUG_QUERY_RESULT>["courses"][number];

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

function formatLevel(level: CourseCardData["level"] | null | undefined) {
  if (!level) return null;
  if (level === "all-levels") return "All levels";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const { getCourseProgress, isSignedIn } = useLearnerProgress();
  const href = `/courses/${course.slug}`;
  const imageSource = course.coverImage?.asset
    ? urlFor(course.coverImage).width(900).height(560).fit("crop").auto("format").url()
    : null;
  const blurDataURL = course.coverImage?.asset?.metadata?.lqip ?? undefined;
  const level = formatLevel(course.level);
  const moduleCount = course.moduleCount ?? 0;
  const lessonCount = course.lessonCount ?? 0;

  const progress = getCourseProgress(course._id, lessonCount);
  const hasProgress = Boolean(
    isSignedIn && (progress.completedCount > 0 || progress.lastLessonSlug || progress.lastLessonId)
  );
  const resumeHref = getCourseResumeHref(
    course.slug,
    progress.lastLessonSlug,
    progress.lastPositionSeconds
  );

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
          {course.instructor?.name && (
            course.instructor.slug ? (
              <Link
                href={`/instructors/${course.instructor.slug}`}
                className="catalog-card-instructor"
                onClick={() =>
                  posthog.capture("catalog_instructor_clicked", {
                    instructor_id: course.instructor?._id,
                    instructor_slug: course.instructor?.slug,
                    course_id: course._id,
                    course_slug: course.slug,
                  })
                }
              >
                By {course.instructor.name}
              </Link>
            ) : (
              <span>By {course.instructor.name}</span>
            )
          )}
        </div>
        <h2><Link href={href}>{course.title}</Link></h2>
        {course.summary && <p>{course.summary}</p>}

        {hasProgress && (
          <div
            className="catalog-card-progress"
            aria-label={`Course progress: ${progress.percentage}% complete`}
          >
            <div
              className="catalog-card-progress-track"
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress.percentage}%` }} />
            </div>
            <div className="catalog-card-progress-labels">
              <span className="catalog-card-progress-pct">
                {progress.percentage}% complete
              </span>
              {lessonCount > 0 && (
                <span className="catalog-card-progress-count">
                  {progress.completedCount} of {lessonCount}{" "}
                  {lessonCount === 1 ? "lesson" : "lessons"}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="catalog-card-footer">
          <div className="catalog-card-meta" aria-label="Course details">
            {level && <span>{level}</span>}
            <span>{formatDuration(course.durationSeconds)}</span>
            <span>{moduleCount} {moduleCount === 1 ? "module" : "modules"}</span>
          </div>
          <div className="catalog-card-actions">
            {hasProgress && !progress.isCompleted ? (
              <>
                <Link
                  className="catalog-card-resume-action"
                  href={resumeHref}
                  aria-label={`Resume ${course.title}`}
                  onClick={() =>
                    posthog.capture("course_resume_clicked", {
                      course_id: course._id,
                      course_slug: course.slug,
                      lesson_slug: progress.lastLessonSlug,
                      position_seconds: progress.lastPositionSeconds,
                      source: "catalog_card",
                    })
                  }
                >
                  Resume <ArrowRight />
                </Link>
                <Link
                  className="catalog-card-action catalog-card-action-secondary"
                  href={href}
                  aria-label={`View course: ${course.title}`}
                  onClick={() =>
                    posthog.capture("all_courses_course_clicked", {
                      course_id: course._id,
                      course_slug: course.slug,
                    })
                  }
                >
                  Details
                </Link>
              </>
            ) : (
              <Link
                className="catalog-card-action"
                href={href}
                aria-label={
                  hasProgress && progress.isCompleted
                    ? `Review course: ${course.title}`
                    : `View course: ${course.title}`
                }
                onClick={() =>
                  posthog.capture("all_courses_course_clicked", {
                    course_id: course._id,
                    course_slug: course.slug,
                  })
                }
              >
                {hasProgress && progress.isCompleted ? (
                  <>
                    <span className="catalog-card-completed-text">
                      <svg
                        viewBox="0 0 18 18"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m3.5 9.5 3.5 3.5 7.5-8" />
                      </svg>
                      Completed
                    </span>{" "}
                    · Review course <ArrowRight />
                  </>
                ) : (
                  <>
                    View course <ArrowRight />
                  </>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
