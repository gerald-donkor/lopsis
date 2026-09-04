import type { Metadata } from "next";
import { AllCoursesPage } from "@/components/all-courses-page";
import { getCourses } from "@/sanity/data/courses";

export const metadata: Metadata = {
  title: "All Courses — Lopsis",
  description: "Explore every course available on Lopsis.",
};

export default async function CoursesRoute() {
  const courses = await getCourses();

  return <AllCoursesPage courses={courses} />;
}
