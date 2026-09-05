"use client";

import { useState } from "react";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import type { LESSON_BY_SLUG_QUERY_RESULT } from "@/sanity.types";
import { SiteHeader } from "@/components/site-header";
import { LessonVideo } from "@/components/lesson-video";

type Lesson = NonNullable<LESSON_BY_SLUG_QUERY_RESULT> & {
  module: { moduleIndex: number; lessonIndex: number; moduleNumber: number; lessonNumber: number } | null;
};
type CourseModule = NonNullable<Lesson["course"]>["modules"][number];
type FlatLesson = CourseModule["lessons"][number] & { module: CourseModule; moduleIndex: number; lessonIndex: number };

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
    link: ({ children, value }) => <a href={value?.href} target="_blank" rel="noreferrer noopener">{children}</a>,
  },
};

function Arrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={direction === "left" ? "arrow-left" : undefined}><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Chevron({ up = false }: { up?: boolean }) { return <svg className={up ? "is-up" : undefined} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Check() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.4" /><path d="m6.8 10.2 2.1 2.1 4.3-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Clock() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.4" /><path d="M10 5.8v4.5l3 1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function Level() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 17v-3M7.7 17v-7M12.3 17V6M17 17V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function Students() { return <svg viewBox="0 0 22 20" fill="none" aria-hidden="true"><circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.35" /><path d="M2.7 16c.5-3 2.3-4.7 5.3-4.7s4.8 1.7 5.3 4.7M14.5 3.7a2.7 2.7 0 0 1 0 5.2M15.5 11.2c2.3.4 3.7 2 4 4.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" /></svg>; }
function Bookmark() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 3.5h11v17L12 17l-5.5 3.5v-17Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>; }
function Tip() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6M10 21h4M8.4 14.7A6.5 6.5 0 1 1 15.6 14.7c-.7.6-1.1 1.4-1.2 2.3H9.6c-.1-.9-.5-1.7-1.2-2.3Z" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function External() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M11 4h5v5M16 4l-7 7M15 11v4H5V5h4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function formatDuration(seconds: number | null | undefined) { const minutes = Math.max(0, Math.round((seconds ?? 0) / 60)); const hours = Math.floor(minutes / 60); return hours ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`; }
function formatLevel(level: string | null | undefined) { return level === "all-levels" ? "All levels" : level ? level[0].toUpperCase() + level.slice(1) : null; }
function formatStudents(count: number) { return new Intl.NumberFormat("en").format(count); }
function firstParagraph(notes: unknown): string | null { if (!Array.isArray(notes)) return null; for (const block of notes) { if (block && typeof block === "object" && "children" in block && Array.isArray(block.children)) { const children = block.children as unknown[]; const text = children.map((child: unknown) => child && typeof child === "object" && "text" in child && typeof child.text === "string" ? child.text : "").join("").trim(); if (text) return text; } } return null; }

function ResourceIcon({ type }: { type: string }) { return <span className="lesson-resource-icon" aria-hidden="true">{type === "link" ? "↗" : type === "download" ? "↓" : "▧"}</span>; }

export function LessonPage({ lesson, startSeconds }: { lesson: Lesson; startSeconds: number }) {
  const [tab, setTab] = useState<"content" | "notes">("content");
  const course = lesson.course;
  const modules = course?.modules ?? [];
  const [expandedModules, setExpandedModules] = useState(() => new Set(lesson.module ? [lesson.module.moduleIndex] : []));
  const flatLessons: FlatLesson[] = modules.flatMap((module, moduleIndex) => (module.lessons ?? []).filter(Boolean).map((item, lessonIndex) => ({ ...item, module, moduleIndex, lessonIndex })));
  const currentIndex = flatLessons.findIndex((item) => item._id === lesson._id);
  const previous = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;
  const summary = firstParagraph(lesson.notes);
  const level = formatLevel(course?.level);

  function toggleModule(index: number) { setExpandedModules((current) => { const nextSet = new Set(current); if (nextSet.has(index)) nextSet.delete(index); else nextSet.add(index); return nextSet; }); }

  return <div className="lesson-shell"><div className="lesson-canvas">
    <SiteHeader />
    <div className="lesson-layout">
      <aside className="lesson-rail" aria-label="Course curriculum">
        <Link href={course ? `/courses/${course.slug}` : "/courses"} className="lesson-back"><Arrow direction="left" /> Back to course</Link>
        <section className="lesson-course-summary">
          <span className="lesson-course-icon" aria-hidden="true">{course?.title.slice(0, 1) ?? "L"}</span>
          <div><strong>{course?.title ?? "Course"}</strong><span>0% complete</span><i><b /></i></div>
        </section>
        <ol className="lesson-modules">
          {modules.map((module, moduleIndex) => { const expanded = expandedModules.has(moduleIndex); const panelId = `lesson-module-${moduleIndex}`; return <li key={module._key} className={lesson.module?.moduleIndex === moduleIndex ? "is-current-module" : undefined}>
            <button type="button" onClick={() => toggleModule(moduleIndex)} aria-expanded={expanded} aria-controls={panelId}><span className="lesson-module-number">{moduleIndex + 1}</span><span><strong>{module.title}</strong><em>{formatDuration(module.lessons?.reduce((total, item) => total + (item?.durationSeconds ?? 0), 0))}</em></span><Chevron up={expanded} /></button>
            {expanded && <ol id={panelId} className="lesson-rail-lessons">{(module.lessons ?? []).map((item) => item && <li key={item._id} className={item._id === lesson._id ? "is-current-lesson" : undefined}><span aria-hidden="true" />{item._id === lesson._id ? <strong>{item.title}<em>Now playing</em></strong> : <Link href={`/lessons/${item.slug}`}><strong>{item.title}</strong><em>{formatDuration(item.durationSeconds)}</em></Link>}</li>)}</ol>}
          </li>; })}
        </ol>
      </aside>
      <main className="lesson-main">
        <nav className="lesson-breadcrumb" aria-label="Breadcrumb"><Link href="/courses">All Courses</Link><span>›</span>{course && <><Link href={`/courses/${course.slug}`}>{course.title}</Link><span>›</span></>}{lesson.module && <><span>{modules[lesson.module.moduleIndex]?.title}</span><span>›</span></>}<b>{lesson.title}</b></nav>
        <section className="lesson-header"><p>Lesson {lesson.module?.moduleNumber ?? 1}.{lesson.module?.lessonNumber ?? 1}</p><div><h1>{lesson.title}</h1><button type="button" aria-label="Bookmark lesson"><Bookmark /></button></div>{summary && <p className="lesson-summary">{summary}</p>}<div className="lesson-meta"><span><Clock /> {formatDuration(lesson.durationSeconds)}</span>{level && <span><Level /> {level}</span>}<span><Students /> {formatStudents(lesson.studentCount)} students</span></div></section>
        <LessonVideo lessonSlug={lesson.slug} lessonTitle={lesson.title} videoUrl={lesson.videoUrl} startSeconds={startSeconds} />
        <section className="lesson-content"><div className="lesson-tabs" role="tablist" aria-label="Lesson details"><button type="button" id="lesson-content-tab" role="tab" aria-selected={tab === "content"} aria-controls="lesson-content-panel" onClick={() => setTab("content")}>Lesson Content</button><button type="button" id="lesson-notes-tab" role="tab" aria-selected={tab === "notes"} aria-controls="lesson-content-panel" onClick={() => setTab("notes")}>Notes</button></div><div id="lesson-content-panel" role="tabpanel" aria-labelledby={tab === "content" ? "lesson-content-tab" : "lesson-notes-tab"} className="lesson-prose">{tab === "content" && <><h2>Overview</h2>{lesson.notes && <PortableText value={lesson.notes} components={portableTextComponents} />}{lesson.keyPoints?.length ? <section className="lesson-key-points"><h3>In this lesson you will:</h3><ul>{lesson.keyPoints.map((point) => <li key={point}><Check />{point}</li>)}</ul></section> : null}{lesson.proTip && <aside className="lesson-pro-tip"><Tip /><div><strong>Pro Tip</strong><p>{lesson.proTip}</p></div></aside>}</>}{tab === "notes" && (lesson.notes ? <PortableText value={lesson.notes} components={portableTextComponents} /> : <p>No notes are available for this lesson.</p>)}</div></section>
        {lesson.resources?.length ? <section className="lesson-resources"><h2>Resources</h2><div>{lesson.resources.map((resource) => <a key={resource._key} href={resource.url} target="_blank" rel="noreferrer noopener"><ResourceIcon type={resource.type} /><span><strong>{resource.title}</strong><small>{resource.description}</small></span><External /></a>)}</div></section> : null}
      </main>
    </div>
    <nav className="lesson-pagination" aria-label="Lesson navigation"><div>{previous ? <Link href={`/lessons/${previous.slug}`}><Arrow direction="left" /><span><small>Previous Lesson</small><strong>{previous.title}</strong></span></Link> : <span />}</div><div>{next ? <Link href={`/lessons/${next.slug}`}><span><small>Next Lesson</small><strong>{next.title}</strong></span><Arrow /></Link> : <span />}</div></nav>
  </div></div>;
}
