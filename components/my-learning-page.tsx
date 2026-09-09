"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import type { COURSES_QUERY_RESULT } from "@/sanity.types";
import { CourseCard } from "@/components/course-card";
import { SiteHeader } from "@/components/site-header";
import { useLearnerProgress } from "@/lib/progress/use-learner-progress";
import { useBookmarks } from "@/lib/bookmarks/use-bookmarks";
import type { BookmarkItem } from "@/lib/bookmarks/types";
import {
  getCompletedCourses,
  getInProgressCourses,
  partitionBookmarks,
} from "@/lib/progress/my-learning";

type TabKey = "in-progress" | "completed" | "bookmarked";

function ChevronRight() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="m7 4 5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayLessonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

export function MyLearningPage({ courses }: { courses: COURSES_QUERY_RESULT }) {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { getCourseProgress } = useLearnerProgress();
  const { bookmarks, removeBookmark } = useBookmarks();

  const [activeTab, setActiveTab] = useState<TabKey>("in-progress");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoaded) return;
    posthog.capture("my_learning_viewed", { is_signed_in: Boolean(isSignedIn) });
  }, [isSignedIn, authLoaded]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const inProgressCourses = useMemo(
    () => getInProgressCourses(courses, getCourseProgress, Boolean(isSignedIn)),
    [courses, getCourseProgress, isSignedIn]
  );

  const completedCourses = useMemo(
    () => getCompletedCourses(courses, getCourseProgress, Boolean(isSignedIn)),
    [courses, getCourseProgress, isSignedIn]
  );

  const { bookmarkedCourses, bookmarkedLessons } = useMemo(
    () => partitionBookmarks(bookmarks, courses),
    [bookmarks, courses]
  );

  const totalBookmarksCount = bookmarkedCourses.length + bookmarkedLessons.length;

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    posthog.capture("my_learning_tab_changed", { tab });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentTab: TabKey) => {
    const tabs: TabKey[] = ["in-progress", "completed", "bookmarked"];
    const currentIndex = tabs.indexOf(currentTab);
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    handleTabChange(nextTab);
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  const handleRemoveBookmark = (item: BookmarkItem) => {
    removeBookmark(item.id);
    showToast(`Removed "${item.title}" from bookmarks`);
    posthog.capture("my_learning_bookmark_removed", {
      item_id: item.id,
      item_type: item.type,
      item_slug: item.slug,
    });
  };

  return (
    <div className="catalog-shell my-learning-shell">
      <div className="catalog-canvas my-learning-canvas">
        <SiteHeader />
        <main className="catalog-main my-learning-main">
          <nav className="instructor-breadcrumb" aria-label="Breadcrumb">
            <Link href="/courses">All Courses</Link>
            <ChevronRight />
            <span aria-current="page">My Learning</span>
          </nav>

          <header className="catalog-heading">
            <p className="catalog-eyebrow">Learner Dashboard</p>
            <h1>My Learning</h1>
            <p>
              Track your progress, continue where you left off, and revisit bookmarked courses and
              lessons.
            </p>
          </header>

          {authLoaded && !isSignedIn ? (
            <section
              className="my-learning-auth-banner"
              aria-labelledby="my-learning-auth-title"
            >
              <div className="my-learning-auth-icon-wrapper" aria-hidden="true">
                <GraduationCapIcon />
              </div>
              <div className="my-learning-auth-content">
                <h2 id="my-learning-auth-title">Sign in to access your learning dashboard</h2>
                <p>
                  Keep track of your course progress, resume lessons right where you left off
                  across all your devices, and save your favorite courses and lessons for quick
                  reference.
                </p>
                <div className="my-learning-auth-actions">
                  <SignInButton>
                    <button className="my-learning-btn my-learning-btn-primary" type="button">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="my-learning-btn my-learning-btn-secondary" type="button">
                      Create free account
                    </button>
                  </SignUpButton>
                  <Link href="/courses" className="my-learning-btn my-learning-btn-ghost">
                    Browse courses
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="my-learning-dashboard">
              <div className="my-learning-tabs-bar">
                <div
                  className="my-learning-tabs"
                  role="tablist"
                  aria-label="Learning dashboard views"
                  ref={tabListRef}
                >
                  <button
                    type="button"
                    id="tab-in-progress"
                    role="tab"
                    aria-selected={activeTab === "in-progress"}
                    aria-controls="tabpanel-in-progress"
                    tabIndex={activeTab === "in-progress" ? 0 : -1}
                    className={`my-learning-tab ${activeTab === "in-progress" ? "is-active" : ""}`}
                    onClick={() => handleTabChange("in-progress")}
                    onKeyDown={(e) => handleKeyDown(e, "in-progress")}
                  >
                    <span>In Progress</span>
                    <span className="my-learning-tab-count">{inProgressCourses.length}</span>
                  </button>

                  <button
                    type="button"
                    id="tab-completed"
                    role="tab"
                    aria-selected={activeTab === "completed"}
                    aria-controls="tabpanel-completed"
                    tabIndex={activeTab === "completed" ? 0 : -1}
                    className={`my-learning-tab ${activeTab === "completed" ? "is-active" : ""}`}
                    onClick={() => handleTabChange("completed")}
                    onKeyDown={(e) => handleKeyDown(e, "completed")}
                  >
                    <span>Completed</span>
                    <span className="my-learning-tab-count">{completedCourses.length}</span>
                  </button>

                  <button
                    type="button"
                    id="tab-bookmarked"
                    role="tab"
                    aria-selected={activeTab === "bookmarked"}
                    aria-controls="tabpanel-bookmarked"
                    tabIndex={activeTab === "bookmarked" ? 0 : -1}
                    className={`my-learning-tab ${activeTab === "bookmarked" ? "is-active" : ""}`}
                    onClick={() => handleTabChange("bookmarked")}
                    onKeyDown={(e) => handleKeyDown(e, "bookmarked")}
                  >
                    <span>Bookmarked</span>
                    <span className="my-learning-tab-count">{totalBookmarksCount}</span>
                  </button>
                </div>
                <Link href="/courses" className="my-learning-tab-explore">
                  Explore courses <ArrowRight />
                </Link>
              </div>

              {activeTab === "in-progress" && (
                <section
                  id="tabpanel-in-progress"
                  role="tabpanel"
                  aria-labelledby="tab-in-progress"
                  className="my-learning-tabpanel"
                >
                  {inProgressCourses.length > 0 ? (
                    <div className="catalog-grid">
                      {inProgressCourses.map((course) => (
                        <CourseCard key={course._id} course={course} />
                      ))}
                    </div>
                  ) : (
                    <div className="catalog-empty" aria-labelledby="in-progress-empty-title">
                      <h2 id="in-progress-empty-title">No courses in progress</h2>
                      <p>
                        You haven&apos;t started any courses yet. Explore our catalog to find a
                        course and start building durable, real-world skills.
                      </p>
                      <div className="my-learning-empty-actions">
                        <Link href="/courses" className="my-learning-btn my-learning-btn-primary">
                          Explore courses
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === "completed" && (
                <section
                  id="tabpanel-completed"
                  role="tabpanel"
                  aria-labelledby="tab-completed"
                  className="my-learning-tabpanel"
                >
                  {completedCourses.length > 0 ? (
                    <div className="catalog-grid">
                      {completedCourses.map((course) => (
                        <CourseCard key={course._id} course={course} />
                      ))}
                    </div>
                  ) : (
                    <div className="catalog-empty" aria-labelledby="completed-empty-title">
                      <h2 id="completed-empty-title">No completed courses yet</h2>
                      <p>
                        When you finish all lessons in a course, it will be proudly displayed here.
                        Keep going!
                      </p>
                      <div className="my-learning-empty-actions">
                        {inProgressCourses.length > 0 && (
                          <button
                            type="button"
                            className="my-learning-switch-btn"
                            onClick={() => handleTabChange("in-progress")}
                          >
                            View courses in progress <ArrowRight />
                          </button>
                        )}
                        <Link
                          href="/courses"
                          className={`my-learning-btn ${
                            inProgressCourses.length > 0
                              ? "my-learning-btn-secondary"
                              : "my-learning-btn-primary"
                          }`}
                        >
                          Explore courses
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === "bookmarked" && (
                <section
                  id="tabpanel-bookmarked"
                  role="tabpanel"
                  aria-labelledby="tab-bookmarked"
                  className="my-learning-tabpanel"
                >
                  {totalBookmarksCount > 0 ? (
                    <div className="my-learning-bookmarks-container">
                      {bookmarkedCourses.length > 0 && (
                        <div className="my-learning-section">
                          <div className="my-learning-section-header">
                            <h2>Saved Courses</h2>
                            <span className="my-learning-count-label">
                              {bookmarkedCourses.length}{" "}
                              {bookmarkedCourses.length === 1 ? "course" : "courses"}
                            </span>
                          </div>
                          <div className="catalog-grid">
                            {bookmarkedCourses.map((course) => (
                              <CourseCard key={course._id} course={course} />
                            ))}
                          </div>
                        </div>
                      )}

                      {bookmarkedLessons.length > 0 && (
                        <div className="my-learning-section">
                          <div className="my-learning-section-header">
                            <h2>Saved Lessons</h2>
                            <span className="my-learning-count-label">
                              {bookmarkedLessons.length}{" "}
                              {bookmarkedLessons.length === 1 ? "lesson" : "lessons"}
                            </span>
                          </div>
                          <div className="my-learning-lessons-grid">
                            {bookmarkedLessons.map((lesson) => (
                              <article key={lesson.id} className="my-learning-lesson-card">
                                <div className="my-learning-lesson-icon" aria-hidden="true">
                                  <PlayLessonIcon />
                                </div>
                                <div className="my-learning-lesson-content">
                                  <div className="my-learning-lesson-meta">
                                    <span className="my-learning-lesson-tag">Lesson</span>
                                    {lesson.bookmarkedAt && (
                                      <span className="my-learning-lesson-date">
                                        Saved {formatDate(lesson.bookmarkedAt)}
                                      </span>
                                    )}
                                  </div>
                                  <h3>
                                    <Link href={`/lessons/${lesson.slug}`}>{lesson.title}</Link>
                                  </h3>
                                </div>
                                <div className="my-learning-lesson-actions">
                                  <Link
                                    href={`/lessons/${lesson.slug}`}
                                    className="my-learning-lesson-open"
                                    aria-label={`Open lesson: ${lesson.title}`}
                                  >
                                    <span>Open</span>
                                    <ArrowRight />
                                  </Link>
                                  <button
                                    type="button"
                                    className="my-learning-lesson-unbookmark"
                                    onClick={() => handleRemoveBookmark(lesson)}
                                    aria-label={`Remove "${lesson.title}" from bookmarks`}
                                    title="Remove bookmark"
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="catalog-empty" aria-labelledby="bookmarks-empty-title">
                      <h2 id="bookmarks-empty-title">No bookmarks saved</h2>
                      <p>
                        Click the bookmark icon on any course or lesson to save it here for quick
                        access whenever you return.
                      </p>
                      <div className="my-learning-empty-actions">
                        <Link href="/courses" className="my-learning-btn my-learning-btn-secondary">
                          Explore courses
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {toastMessage && (
            <div className="course-toast" role="status" aria-live="polite">
              {toastMessage}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
