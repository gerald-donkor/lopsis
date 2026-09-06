"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";
import type {FormEvent} from "react";
import posthog from "posthog-js";
import {ANALYTICS_EVENTS} from "@/lib/analytics/events";
import type {SearchResponse, SearchResult} from "@/lib/search/schema";
import {SiteHeader} from "@/components/site-header";

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.7" /><path d="m15.4 15.4 4.8 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function Arrow() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function Play() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" /><path d="m10 8.7 5.2 3.3-5.2 3.3V8.7Z" fill="currentColor" /></svg>; }
function LessonIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 2.5h7l4 4V17h-11V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M11.5 2.8v4h3.7M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function Folder() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 5h6l2 2h7v9h-15V5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function Chevron() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function OpenIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M11 3h6v6m0-6-9 9M8 4H3v13h13v-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

function CourseIdentity({result}: {result: SearchResult}) {
  return <div className="search-result-course">{result.courseIconUrl ? <span><Image src={result.courseIconUrl} alt="" fill sizes="24px" /></span> : <i aria-hidden="true">{result.courseTitle.slice(0, 1)}</i>}<span>{result.courseTitle}</span></div>;
}

function ResultCard({result, rank, sort}: {result: SearchResult; rank: number; sort: string}) {
  const lessonLabel = `Lesson ${result.moduleNumber}.${result.lessonNumber}`;
  const href = `/lessons/${encodeURIComponent(result.lessonSlug)}${result.kind === "video" ? `?start=${result.startSeconds}` : ""}`;
  function captureClick(linkPosition: "poster" | "title" | "action") {
    posthog.capture(ANALYTICS_EVENTS.searchResultOpened, {
      result_type: result.kind,
      result_id: result.id,
      result_rank: rank,
      sort,
      link_position: linkPosition,
      course_id: result.courseId,
      course_slug: result.courseSlug,
      lesson_id: result.lessonId,
      lesson_slug: result.lessonSlug,
      start_seconds: result.kind === "video" ? result.startSeconds : undefined,
      match_source: result.kind === "video" ? result.matchSource : undefined,
    });
  }
  return <article className={`search-result-card is-${result.kind}`}>
    <div className="search-result-visual">
      {result.kind === "video" ? <Link className="search-poster-link" href={href} onClick={() => captureClick("poster")} aria-label={`Watch ${result.lessonTitle} from ${formatTime(result.startSeconds)}`}>
        {result.posterUrl ? <Image src={result.posterUrl} alt="" fill sizes="(max-width: 620px) calc(100vw - 64px), 274px" /> : <span className="search-result-poster-fallback">{result.courseTitle.slice(0, 1)}</span>}
        <span className="search-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 13 8-13 8V4Z" fill="currentColor" /></svg></span>
        {result.clipLengthSeconds !== null && <b aria-label={`Clip duration ${formatTime(result.clipLengthSeconds)}`}>{formatTime(result.clipLengthSeconds)}</b>}
      </Link> : <><LessonIcon />{result.keyPoints.length ? <ul>{result.keyPoints.slice(0, 3).map((point, index) => <li key={index}>{point}</li>)}</ul> : <span className="search-keypoints-empty">Lesson notes</span>}</>}
    </div>
    <div className="search-result-copy">
      <div className="search-result-top"><CourseIdentity result={result} /><span className={`search-kind is-${result.kind}`}>{result.kind}</span></div>
      <h2><Link href={href} onClick={() => captureClick("title")}>{result.lessonTitle}</Link></h2>
      <p>{result.description}</p>
      <div className="search-result-footer"><span className="search-result-context"><span><LessonIcon />{lessonLabel}</span><i>·</i><span><Folder />{result.moduleTitle}</span></span><Link href={href} onClick={() => captureClick("action")}>{result.kind === "video" ? <><Play />Watch from {formatTime(result.startSeconds)}</> : <>View lesson<OpenIcon /></>}<Chevron /></Link></div>
    </div>
  </article>;
}

export function SearchPage({initialQuery}: {initialQuery: string}) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState("relevance");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!initialQuery) return;
    const controller = new AbortController();
    fetch("/api/search", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({query: initialQuery}), signal: controller.signal})
      .then(async (result) => { const payload = await result.json() as SearchResponse | {error?: string}; if (!result.ok) throw new Error("error" in payload && payload.error ? payload.error : "Search failed"); return payload as SearchResponse; })
      .then((payload) => { if (controller.signal.aborted) return; setResponse(payload); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Search is temporarily unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initialQuery, attempt]);

  function retry() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setAttempt((value) => value + 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    if (query === initialQuery) {
      if (!loading) retry();
      return;
    }
    router.push(`/search?q=${encodeURIComponent(query.slice(0, 240))}`);
  }

  function changeSort(nextSort: string) {
    setSort(nextSort);
    posthog.capture(ANALYTICS_EVENTS.searchSortChanged, {
      sort: nextSort,
      result_count: response?.resultCount ?? 0,
    });
  }

  const resultCount = response?.resultCount ?? 0;
  const results = [...(response?.results ?? [])].sort((a, b) => {
    const order = sort === "title" ? a.lessonTitle.localeCompare(b.lessonTitle) : sort === "course" ? a.courseTitle.localeCompare(b.courseTitle) : 0;
    return order || b.relevance - a.relevance || a.id.localeCompare(b.id);
  });
  return <div className="search-shell"><div className="search-canvas"><SiteHeader /><main className="search-main">
    <header className="search-heading"><span>Search results</span><h1>{initialQuery ? <>Results for <em>“{initialQuery}”</em></> : "Search your learning"}</h1>{response && <p>Found {resultCount} {resultCount === 1 ? "result" : "results"} across {response.courseCount} {response.courseCount === 1 ? "course" : "courses"}</p>}</header>
    <form className="search-query" role="search" onSubmit={submit}><button className="search-submit" type="submit" aria-label="Search"><SearchIcon /></button><label className="sr-only" htmlFor="results-search">Search lessons and video moments</label><input ref={inputRef} id="results-search" name="q" type="search" maxLength={240} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything about your learning…" /><button className="search-shortcut" type="button" onClick={() => inputRef.current?.focus()} aria-label="Focus search (Command or Control K)" aria-keyshortcuts="Meta+k Control+k"><kbd>⌘ K</kbd></button></form>
    <p className="sr-only" role="status">{loading ? "Searching lessons and video moments…" : response ? `Found ${resultCount} results across ${response.courseCount} courses.` : ""}</p>
    {initialQuery && <div className="search-toolbar"><strong>{loading ? "Searching…" : error ? "Search results" : `${resultCount} ${resultCount === 1 ? "result" : "results"}`}</strong><label><span className="sr-only">Sort results</span><select disabled={loading || !response?.results.length} value={sort} onChange={(event) => changeSort(event.target.value)}><option value="relevance">Most Relevant</option><option value="title">Title A–Z</option><option value="course">Course A–Z</option></select><span>⌄</span></label></div>}
    {loading && <div className="search-results" aria-live="polite" aria-busy="true">{[1,2,3].map((item) => <div className="search-result-skeleton" key={item} />)}</div>}
    {!loading && error && <section className="search-state" role="alert"><SearchIcon /><h2>Search is unavailable</h2><p>{error}</p><button type="button" onClick={retry}>Try again</button></section>}
    {!loading && !error && results.length ? <section className="search-results" aria-label="Search results">{results.map((result, index) => <ResultCard key={result.id} result={result} rank={index + 1} sort={sort} />)}</section> : null}
    {!loading && !error && initialQuery && response && !response.results.length ? <section className="search-state"><SearchIcon /><h2>No matching lessons yet</h2><p>Try different keywords or browse the full course catalog.</p><Link href="/courses">Browse all courses <Arrow /></Link></section> : null}
    {!initialQuery && <section className="search-state is-empty"><SearchIcon /><h2>What would you like to learn?</h2><p>Search across every Lopsis course, lesson, and available video moment.</p></section>}
    {response?.results.length ? <aside className="search-catalog-callout"><SearchIcon /><div><strong>Can’t find what you’re looking for?</strong><span>Try different keywords or browse our full course catalog.</span></div><Link href="/courses">Browse all courses <Arrow /></Link></aside> : null}
  </main></div></div>;
}
