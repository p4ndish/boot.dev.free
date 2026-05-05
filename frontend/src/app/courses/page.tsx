// app/courses/page.tsx — Course Catalog
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";

interface Course {
  uuid: string;
  slug: string;
  title: string;
  lessonCount: number;
  hours: number;
  type: string;
  chapters: number;
}

export default async function CoursesPage() {
  const dataPath = path.join(process.cwd(), "..", "data", "course-summary.json");
  let courses: Course[] = [];
  try {
    courses = JSON.parse(await fs.readFile(dataPath, "utf-8"));
  } catch {}

  const mainCourses = courses.filter(c => c.type === "Course" || c.type === "course");
  const projects = courses.filter(c => c.type !== "Course" && c.type !== "course");

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Course Catalog</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-yellow-400">Courses</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainCourses.map((c) => (
              <Link
                key={c.uuid}
                href={`/courses/${c.slug}`}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-yellow-500/30 transition-all"
              >
                <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>{c.lessonCount} lessons</div>
                  <div>{c.hours} hours</div>
                  <div>{c.chapters} chapters</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {projects.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-6 text-orange-400">Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((c) => (
                <Link
                  key={c.uuid}
                  href={`/courses/${c.slug}`}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-orange-500/30 transition-all"
                >
                  <h3 className="font-semibold text-lg mb-1">{c.title}</h3>
                  <div className="text-sm text-gray-400">
                    {c.lessonCount} steps • {c.hours}h
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
