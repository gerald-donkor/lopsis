import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstructorPage } from "@/components/instructor-page";
import { getInstructorBySlug } from "@/sanity/data/instructors";

type InstructorRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: InstructorRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const instructor = await getInstructorBySlug(slug);

  if (!instructor) {
    return { title: "Instructor not found — Lopsis" };
  }

  const expertiseDescription = instructor.expertise?.length
    ? `expert in ${instructor.expertise.join(", ")}`
    : null;

  const description = expertiseDescription
    ? `Learn from ${instructor.name}, ${expertiseDescription} on Lopsis.`
    : `Learn from ${instructor.name} on Lopsis.`;

  return {
    title: `${instructor.name} — Instructor — Lopsis`,
    description,
  };
}

export default async function InstructorRoute({ params }: InstructorRouteProps) {
  const { slug } = await params;
  const instructor = await getInstructorBySlug(slug);

  if (!instructor) {
    notFound();
  }

  return <InstructorPage instructor={instructor} />;
}
