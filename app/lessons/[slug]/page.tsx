import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPage } from "@/components/lesson-page";
import { getLessonBySlug } from "@/sanity/data/lessons";

type LessonRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string | string[] }>;
};

function parseStart(value: string | string[] | undefined, duration: number | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 0;

  const seconds = Number(raw);
  if (!Number.isSafeInteger(seconds)) return 0;
  return duration ? Math.min(seconds, Math.max(0, duration - 1)) : seconds;
}

export async function generateMetadata({ params }: LessonRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) return { title: "Lesson not found — Lopsis" };

  return {
    title: `${lesson.title} — ${lesson.course?.title ?? "Lesson"} — Lopsis`,
    description: `Learn ${lesson.title} on Lopsis.`,
  };
}

export default async function LessonRoute({ params, searchParams }: LessonRouteProps) {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);

  if (!lesson) notFound();

  const query = await searchParams;
  const startSeconds = parseStart(query.start, lesson.durationSeconds);

  return <LessonPage lesson={lesson} startSeconds={startSeconds} />;
}
