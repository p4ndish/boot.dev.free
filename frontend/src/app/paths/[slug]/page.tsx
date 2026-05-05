// app/paths/[slug]/page.tsx — Path Roadmap Detail
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";

interface PathData {
  uuid: string;
  slug: string;
  title: string;
  description: string;
  technologies: string[];
  estimatedMonths: number;
  courseUUIDs: string[];
  recommendedCourseUUIDs: string[];
}

export default async function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const pathsFile = path.join(process.cwd(), "..", "data", "paths-api.json");
  const coursesFile = path.join(process.cwd(), "..", "data", "courses-api.json");

  let pathData: PathData | null = null;
  let courses: Record<string, any> = {};

  try {
    const paths = JSON.parse(await fs.readFile(pathsFile, "utf-8"));
    pathData = paths.find((p: PathData) => p.slug === slug);
    courses = JSON.parse(await fs.readFile(coursesFile, "utf-8"));
  } catch {}

  if (!pathData) notFound();

  const pathCourses = pathData.courseUUIDs
    .map((uuid) => courses[uuid])
    .filter(Boolean);

  const totalLessons = pathCourses.reduce((sum, c) => sum + (c.lessonCount || 0), 0);
  const totalHours = pathCourses.reduce((sum, c) => sum + (c.hours || 0), 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-500 hover:text-gray-300 mb-4 inline-block">
          ← Home
        </Link>

        <h1 className="text-4xl font-bold mb-4">{pathData.title}</h1>
        <p className="text-xl text-gray-400 mb-6">{pathData.description}</p>

        <div className="flex gap-6 flex-wrap text-gray-300 mb-8">
          {pathData.technologies?.map((tech) => (
            <div key={tech} className="bg-gray-900 rounded-lg px-4 py-2">
              {tech}
            </div>
          ))}
        </div>

        <div className="flex gap-6 flex-wrap text-gray-300 mb-12">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{pathCourses.length}</span>
            <p className="text-sm">Courses</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{totalLessons.toLocaleString()}</span>
            <p className="text-sm">Lessons</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">{totalHours}</span>
            <p className="text-sm">Hours</p>
          </div>
          <div className="bg-gray-900 border border-yellow-500/30 rounded-lg px-6 py-3">
            <span className="text-2xl font-bold text-yellow-400">~{pathData.estimatedMonths}</span>
            <p className="text-sm">Months</p>
          </div>
        </div>

        {/* Course Roadmap */}
        <h2 className="text-2xl font-semibold mb-6">Course Roadmap</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-800" />

          <div className="space-y-6">
            {pathCourses.map((course, idx) => (
              <div key={course.uuid} className="relative pl-16">
                {/* Step number dot */}
                <div className="absolute left-[18px] top-3 w-6 h-6 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-xs font-mono z-10">
                  {idx + 1}
                </div>

                <Link
                  href={`/courses/${course.slug}`}
                  className="block bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-yellow-500/30 transition-all"
                >
                  <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{course.shortDescription}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>{course.lessonCount || 0} lessons</span>
                    <span>{course.hours || 0}h</span>
                    <span>{course.type || "Course"}</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
