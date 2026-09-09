import type { Metadata } from "next";
import { MyLearningPage } from "@/components/my-learning-page";
import { getCourses } from "@/sanity/data/courses";

export const metadata: Metadata = {
  title: "My Learning — Lopsis",
  description: "Track your course progress, resume recent lessons, and revisit saved bookmarks.",
};

export default async function MyLearningRoute() {
  const courses = await getCourses();

  return <MyLearningPage courses={courses} />;
}
