import HomePage from "../components/home-page";
import { getCourses } from "@/sanity/data/courses";

export default async function Home() {
  const courses = await getCourses();

  return <HomePage courses={courses.slice(0, 3)} />;
}
