"use client";

import { useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useLearnerProgress } from "@/lib/progress/use-learner-progress";

export type CurriculumLesson = {
  id: string;
  title: string;
  slug: string;
  duration: string;
  freePreview?: boolean;
};

export type CurriculumModule = {
  key: string;
  title: string;
  summary: string;
  duration: string;
  lessons: CurriculumLesson[];
};

function Chevron({ expanded = false }: { expanded?: boolean }) {
  return (
    <svg className={expanded ? "is-expanded" : undefined} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8 12 2.6 2.6L16.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CourseCurriculum({
  modules,
  courseId,
  activeResumeLessonId,
}: {
  modules: CurriculumModule[];
  courseId?: string;
  activeResumeLessonId?: string;
}) {
  const { isLessonCompleted } = useLearnerProgress();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const visibleModules = showAll ? modules : modules.slice(0, 3);
  const canCollapse = modules.length > 3;

  function toggleModule(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      const isExpanding = !next.has(key);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      posthog.capture("curriculum_module_expanded", { module_key: key, expanded: isExpanding });
      return next;
    });
  }

  return (
    <div className="course-curriculum-wrap">
      <div className="course-module-list" id="course-module-list">
        {visibleModules.map((module, moduleIndex) => {
          const isExpanded = expanded.has(module.key);
          const panelId = `module-${module.key}-lessons`;

          return (
            <article className="course-module" key={module.key}>
              <button
                className="course-module-button"
                type="button"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => toggleModule(module.key)}
              >
                <span className="course-module-number">{moduleIndex + 1}</span>
                <span className="course-module-copy">
                  <strong>{module.title}</strong>
                  <span>{module.summary}</span>
                </span>
                <span className="course-module-duration">{module.duration}</span>
                <Chevron expanded={isExpanded} />
              </button>
              {isExpanded && (
                <ol className="course-lesson-list" id={panelId}>
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isCompleted = courseId ? isLessonCompleted(courseId, lesson.id) : false;
                    const isInProgress = Boolean(
                      activeResumeLessonId && lesson.id === activeResumeLessonId && !isCompleted
                    );

                    return (
                      <li key={lesson.id} className={isCompleted ? "is-completed" : isInProgress ? "is-in-progress" : undefined}>
                        <Link
                          href={`/lessons/${lesson.slug}`}
                          onClick={() =>
                            posthog.capture("curriculum_lesson_clicked", {
                              lesson_id: lesson.id,
                              lesson_slug: lesson.slug,
                              module_index: moduleIndex + 1,
                              lesson_index: lessonIndex + 1,
                            })
                          }
                        >
                          <span className="course-lesson-num">
                            <span>Lesson {moduleIndex + 1}.{lessonIndex + 1}</span>
                            {isCompleted && (
                              <span className="course-lesson-check" title="Completed" aria-label="Completed">
                                <CheckIcon />
                              </span>
                            )}
                            {isInProgress && (
                              <i className="status-progress" title="In progress" aria-label="In progress" />
                            )}
                          </span>
                          <span className="course-lesson-info">
                            <strong>{lesson.title}</strong>
                            {lesson.freePreview && (
                              <span className="course-lesson-preview">Free preview</span>
                            )}
                          </span>
                          <em>{lesson.duration}</em>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          );
        })}
      </div>
      {canCollapse && (
        <button
          className="course-show-all"
          type="button"
          aria-expanded={showAll}
          aria-controls="course-module-list"
          onClick={() => {
            const next = !showAll;
            setShowAll(next);
            posthog.capture("all_modules_toggled", { showing_all: next, total_modules: modules.length });
          }}
        >
          {showAll ? "Show fewer modules" : `Show all ${modules.length} modules`}
          <Chevron expanded={showAll} />
        </button>
      )}
    </div>
  );
}
