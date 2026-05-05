// app/learn/[courseSlug]/[lessonId]/page.tsx — Lesson Viewer
import Link from "next/link";
import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { LessonClient } from "./LessonClient";

interface StarterFile {
  name: string;
  content: string;
  isHidden?: boolean;
  isReadonly?: boolean;
}

interface SolutionFile {
  name: string;
  content: string;
}

interface LessonData {
  uuid: string;
  slug: string;
  title: string;
  type: string;
  topics: string[];
  courseUUID: string;
  courseSlug: string;
  courseTitle: string;
  chapterUUID: string;
  chapterTitle: string;
  isFree?: boolean;
  difficulty?: number;
  language?: string;
  readme?: string;
  starterFiles?: StarterFile[];
  solutionFiles?: SolutionFile[];
  expectedOutput?: string;
  question?: {
    question: string;
    answers: string[];
    correctAnswer: string;
  };
  cliData?: any;
  orderInChapter?: number;
}

interface ChapterWithLessons {
  uuid: string;
  title: string;
  lessons: { uuid: string; title: string; type: string; slug: string }[];
}

interface CourseForNav {
  slug: string;
  title: string;
  chapters: ChapterWithLessons[];
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}) {
  const { courseSlug, lessonId } = await params;

  // Load lesson content
  const lessonsFile = path.join(
    process.cwd(),
    "..",
    "data",
    "lessons",
    `${courseSlug}.json`
  );
  const coursesFile = path.join(process.cwd(), "..", "data", "courses-api.json");

  let lesson: LessonData | undefined;
  let course: CourseForNav | null = null;
  let allLessonsInCourse: LessonData[] = [];

  try {
    allLessonsInCourse = JSON.parse(await fs.readFile(lessonsFile, "utf-8"));
    lesson = allLessonsInCourse.find(
      (l: LessonData) => l.uuid === lessonId
    );
  } catch {}

  // Load course navigation structure
  try {
    const courses = JSON.parse(await fs.readFile(coursesFile, "utf-8"));
    for (const [, c] of Object.entries<any>(courses)) {
      if (c.slug === courseSlug) {
        course = {
          slug: c.slug,
          title: c.title,
          chapters: (c.chapters || []).map((ch: any) => ({
            uuid: ch.uuid,
            title: ch.title,
            lessons: (ch.lessons || []).map((l: any) => ({
              uuid: l.uuid,
              title: l.title,
              type: l.type,
              slug: l.slug,
            })),
          })),
        };
        break;
      }
    }
  } catch {}

  if (!lesson) notFound();

  // Find navigation
  const allLessonUUIDs =
    course?.chapters?.flatMap((ch) => ch.lessons.map((l) => l.uuid)) || [];
  const currentIdx = allLessonUUIDs.indexOf(lessonId);
  const prevUUID = currentIdx > 0 ? allLessonUUIDs[currentIdx - 1] : null;
  const nextUUID =
    currentIdx < allLessonUUIDs.length - 1
      ? allLessonUUIDs[currentIdx + 1]
      : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <Link
          href={`/courses/${courseSlug}`}
          className="text-gray-400 hover:text-white text-sm mr-4"
        >
          ← {course?.title || courseSlug}
        </Link>
        <span className="text-gray-600 text-sm mr-auto truncate">
          {lesson.chapterTitle} › {lesson.title}
        </span>
        <div className="flex gap-2 text-sm">
          {prevUUID && (
            <Link
              href={`/learn/${courseSlug}/${prevUUID}`}
              className="px-3 py-1 bg-gray-800 rounded text-gray-300 hover:bg-gray-700"
            >
              ← Prev
            </Link>
          )}
          {nextUUID && (
            <Link
              href={`/learn/${courseSlug}/${nextUUID}`}
              className="px-3 py-1 bg-gray-800 rounded text-gray-300 hover:bg-gray-700"
            >
              Next →
            </Link>
          )}
        </div>
      </header>

      {/* Main lesson area */}
      <LessonClient lesson={lesson} courseSlug={courseSlug} nextUUID={nextUUID} />
    </div>
  );
}
