import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePage } from "@/components/course-page";
import { getCourseBySlug } from "@/sanity/data/courses";

type CourseRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CourseRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "Course not found — Lopsis" };

  return {
    title: `${course.title} — Lopsis`,
    description: course.summary || `Learn ${course.title} with Lopsis.`,
  };
}

export default async function CourseRoute({ params }: CourseRouteProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  return <CoursePage course={course} />;
}
