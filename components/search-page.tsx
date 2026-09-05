"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import type {FormEvent} from "react";
import posthog from "posthog-js";
import type {SearchResponse, SearchResult} from "@/lib/search/schema";
import {SiteHeader} from "@/components/site-header";

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.7" /><path d="m15.4 15.4 4.8 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function Arrow() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Play() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="m10 8.7 5.2 3.3-5.2 3.3V8.7Z" fill="currentColor" /></svg>; }
function LessonIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 2.5h7l4 4V17h-11V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M11.5 2.8v4h3.7M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, "0")}`
}

function CourseIdentity({result}: {result: SearchResult}) {
  return <div className="search-result-course">{result.courseIconUrl ? <span><Image src={result.courseIconUrl} alt="" fill sizes="24px" /></span> : <i aria-hidden="true">{result.courseTitle.slice(0, 1)}</i>}<span>{result.courseTitle}</span></div>;
}

function ResultCard({result}: {result: SearchResult}) {
  const lessonLabel = `Lesson ${result.moduleNumber}.${result.lessonNumber}`;
  return <article className={`search-result-card is-${result.kind}`}>
    <div className="search-result-visual">
      {result.kind === "video" ? <>{result.posterUrl ? <Image src={result.posterUrl} alt={`Video poster for ${result.lessonTitle}`} fill sizes="(max-width: 680px) calc(100vw - 64px), 280px" /> : <span className="search-result-poster-fallback">{result.courseTitle.slice(0, 1)}</span>}<span className="search-play"><Play /></span><b>{formatTime(result.startSeconds)}</b></> : <><LessonIcon /><ul>{result.keyPoints.slice(0, 3).map((point) => <li key={point}>{point}</li>)}</ul></>}
    </div>
    <div className="search-result-copy">
      <div className="search-result-top"><CourseIdentity result={result} /><span className={`search-kind is-${result.kind}`}>{result.kind}</span></div>
      <h2>{result.lessonTitle}</h2>
      <p>{result.description}</p>
      <div className="search-result-footer"><span><LessonIcon /> {lessonLabel} <i>·</i> {result.moduleTitle}</span><Link href={result.kind === "video" ? `/lessons/${result.lessonSlug}?start=${result.startSeconds}` : `/lessons/${result.lessonSlug}`} onClick={() => posthog.capture(result.kind === "video" ? "search_video_moment_clicked" : "search_lesson_clicked", {result_type: result.kind, course_slug: result.courseSlug, lesson_slug: result.lessonSlug, start_seconds: result.kind === "video" ? result.startSeconds : undefined})}>{result.kind === "video" ? <><Play />Watch from {formatTime(result.startSeconds)}</> : <>View lesson</>}<Arrow /></Link></div>
    </div>
  </article>;
}

export function SearchPage({initialQuery}: {initialQuery: string}) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery));

  useEffect(() => {
    if (!initialQuery) return;
    const controller = new AbortController();
    fetch("/api/search", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({query: initialQuery}), signal: controller.signal})
      .then(async (result) => { const payload = await result.json() as SearchResponse | {error?: string}; if (!result.ok) throw new Error("error" in payload && payload.error ? payload.error : "Search failed"); return payload as SearchResponse; })
      .then((payload) => { setResponse(payload); posthog.capture("search_performed", {query_length: initialQuery.length, result_count: payload.resultCount, course_count: payload.courseCount}); if (!payload.resultCount) posthog.capture("search_zero_results", {query_length: initialQuery.length}); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Search is temporarily unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initialQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    router.push(`/search?q=${encodeURIComponent(query.slice(0, 240))}`);
  }

  const resultCount = response?.resultCount ?? 0;
  return <div className="search-shell"><div className="search-canvas"><SiteHeader /><main className="search-main">
    <header className="search-heading"><span>Search results</span><h1>{initialQuery ? <>Results for <em>“{initialQuery}”</em></> : "Search your learning"}</h1>{response && <p>Found {resultCount} {resultCount === 1 ? "result" : "results"} across {response.courseCount} {response.courseCount === 1 ? "course" : "courses"}</p>}</header>
    <form className="search-query" role="search" onSubmit={submit}><SearchIcon /><label className="sr-only" htmlFor="results-search">Search lessons and video moments</label><input id="results-search" name="q" type="search" maxLength={240} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything about your learning…" /><kbd>⌘ K</kbd></form>
    {initialQuery && <div className="search-toolbar"><strong>{loading ? "Searching…" : `${resultCount} ${resultCount === 1 ? "result" : "results"}`}</strong><label><span className="sr-only">Sort results</span><select disabled={!response?.results.length} defaultValue="relevance"><option value="relevance">Most Relevant</option></select><span>⌄</span></label></div>}
    {loading && <div className="search-results" aria-live="polite" aria-busy="true">{[1,2,3].map((item) => <div className="search-result-skeleton" key={item} />)}</div>}
    {!loading && error && <section className="search-state" role="alert"><SearchIcon /><h2>Search is unavailable</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></section>}
    {!loading && !error && response?.results.length ? <section className="search-results" aria-label="Search results">{response.results.map((result) => <ResultCard key={result.id} result={result} />)}</section> : null}
    {!loading && !error && initialQuery && response && !response.results.length ? <section className="search-state"><SearchIcon /><h2>No matching lessons yet</h2><p>Try different keywords or browse the full course catalog.</p><Link href="/courses">Browse all courses <Arrow /></Link></section> : null}
    {!initialQuery && <section className="search-state is-empty"><SearchIcon /><h2>What would you like to learn?</h2><p>Search across every Lopsis course, lesson, and available video moment.</p></section>}
    {response?.results.length ? <aside className="search-catalog-callout"><SearchIcon /><div><strong>Can’t find what you’re looking for?</strong><span>Try different keywords or browse our full course catalog.</span></div><Link href="/courses">Browse all courses <Arrow /></Link></aside> : null}
  </main></div></div>;
}
