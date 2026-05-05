// app/courses/[slug]/page.tsx — Course Detail
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";

interface Chapter {
  uuid: string;
  slug: string;
  title: string;
  description: string;
  lessons: LessonRef[];
}

interface LessonRef {
  uuid: string;
  slug: string;
  title: string;
  type: string;
  isFree: boolean;
  difficulty: number;
}

interface CourseData {
  uuid: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  hours: number;
  lessonCount: number;
  type: string;
  chapters: Chapter[];
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const dataPath = path.join(process.cwd(), "..", "data", "courses-api.json");
  let course: CourseData | null = null;

  try {
    const courses = JSON.parse(await fs.readFile(dataPath, "utf-8"));
    for (const [, c] of Object.entries<any>(courses)) {
      if (c.slug === slug) {
        course = c;
        break;
      }
    }
  } catch {}

  if (!course) notFound();

  const totalLessons = course.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <Link href="/courses" className="text-gray-500 hover:text-gray-300 mb-4 inline-block">
          ← All Courses
        </Link>

        <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
        <p className="text-xl text-gray-400 mb-8">{course.shortDescription}</p>

        <div className="flex gap-6 flex-wrap text-gray-300 mb-8">
          <div className="bg-gray-900 rounded-lg px-4 py-2">
            <span className="text-yellow-400 font-bold">{course.hours}</span> hours
          </div>
          <div className="bg-gray-900 rounded-lg px-4 py-2">
            <span className="text-yellow-400 font-bold">{course.lessonCount}</span> lessons
          </div>
          <div className="bg-gray-900 rounded-lg px-4 py-2">
            <span className="text-yellow-400 font-bold">{course.chapters?.length || 0}</span> chapters
          </div>
        </div>

        {course.description && (
          <p className="text-gray-400 mb-12 whitespace-pre-line">{course.description}</p>
        )}

        <h2 className="text-2xl font-semibold mb-6">Chapter List</h2>
        <div className="space-y-4">
          {course.chapters?.map((chapter, idx) => (
            <div key={chapter.uuid} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-yellow-400 font-mono text-sm">{idx + 1}</span>
                <h3 className="text-xl font-semibold">{chapter.title}</h3>
              </div>
              {chapter.description && (
                <p className="text-gray-400 text-sm mb-4">{chapter.description}</p>
              )}
              <div className="space-y-1 ml-6">
                {chapter.lessons?.map((lesson) => (
                  <Link
                    key={lesson.uuid}
                    href={`/learn/${slug}/${lesson.uuid}`}
                    className="flex items-center gap-3 py-1.5 px-3 rounded hover:bg-gray-800 transition-colors group"
                  >
                    <span className={`w-2 h-2 rounded-full ${lesson.isFree ? 'bg-green-500' : 'bg-gray-600'}`} />
                    <span className="text-gray-300 group-hover:text-white">{lesson.title}</span>
                    <span className="text-xs text-gray-600 ml-auto">{lesson.type.replace("type_", "")}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Start Course button */}
        <div className="mt-12 text-center">
          <Link
            href={`/learn/${slug}/${course.chapters?.[0]?.lessons?.[0]?.uuid || ''}`}
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-gray-950 px-8 py-3 rounded-lg font-bold text-lg transition-all hover:shadow-lg hover:shadow-yellow-500/25"
          >
            Start Course →
          </Link>
        </div>
      </div>
    </main>
  );
}
