// app/page.tsx — Homepage
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";

interface PathData {
  uuid: string;
  slug: string;
  title: string;
  description: string;
  technologies: string[];
  estimatedMonths: number;
  courseUUIDs: string[];
}

interface CourseSummary {
  uuid: string;
  slug: string;
  title: string;
  lessonCount: number;
  hours: number;
  type: string;
}

async function getPaths(): Promise<PathData[]> {
  const dataPath = path.join(process.cwd(), "..", "data", "paths-api.json");
  try {
    const data = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function getCourseSummary(): Promise<CourseSummary[]> {
  const dataPath = path.join(process.cwd(), "..", "data", "course-summary.json");
  try {
    const data = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [paths, courses] = await Promise.all([getPaths(), getCourseSummary()]);
  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);
  const totalHours = courses.reduce((sum, c) => sum + c.hours, 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Hero */}
      <section className="py-24 px-4 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Learn to Code, for Real.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Master backend development with interactive coding lessons, 
          hands-on projects, and a structured curriculum.
        </p>
        <div className="flex gap-4 justify-center flex-wrap text-gray-300 mb-8">
          <div className="bg-gray-900 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{courses.length}</span>
            <p className="text-sm">Courses</p>
          </div>
          <div className="bg-gray-900 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{totalLessons.toLocaleString()}</span>
            <p className="text-sm">Lessons</p>
          </div>
          <div className="bg-gray-900 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{totalHours.toLocaleString()}</span>
            <p className="text-sm">Hours of Content</p>
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="px-4 pb-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Pick a Learning Path</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {paths.map((p) => (
            <Link
              key={p.uuid}
              href={`/paths/${p.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-yellow-500/50 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
            >
              <h3 className="text-2xl font-bold mb-3">{p.title}</h3>
              <p className="text-gray-400 mb-4">{p.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {p.technologies?.map((tech) => (
                  <span key={tech} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                {p.courseUUIDs?.length || 0} courses • ~{p.estimatedMonths} months
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Course Catalog */}
      <section className="px-4 pb-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">All Courses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.filter(c => c.type === "Course" || c.type === "course").slice(0, 30).map((c) => (
            <Link
              key={c.uuid}
              href={`/courses/${c.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-yellow-500/30 transition-all"
            >
              <h4 className="font-semibold text-lg mb-1">{c.title}</h4>
              <div className="text-sm text-gray-400">
                {c.lessonCount} lessons • {c.hours}h
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/courses"
            className="text-yellow-400 hover:text-yellow-300 font-semibold"
          >
            View all {courses.length} courses →
          </Link>
        </div>
      </section>
    </main>
  );
}
