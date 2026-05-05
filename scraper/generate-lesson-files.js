/**
 * generate-lesson-files.js
 * Generates per-course lesson JSON files from the unified lessons-api.json
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const LESSONS_DIR = path.join(DATA_DIR, "lessons");

if (!fs.existsSync(LESSONS_DIR)) fs.mkdirSync(LESSONS_DIR, { recursive: true });

const courses = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "courses-api.json"), "utf8"));
const lessons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "lessons-api.json"), "utf8"));

let totalWithContent = 0;
let courseFilesGenerated = 0;

for (const [courseUUID, course] of Object.entries(courses)) {
  const slug = course.slug || course.Slug;
  if (!slug) continue;

  const courseLessons = [];
  
  for (const chapter of course.chapters || []) {
    for (const lesson of chapter.lessons || []) {
      const lessonData = lessons[lesson.uuid];
      if (lessonData) {
        courseLessons.push({
          ...lessonData,
          chapterTitle: chapter.title,
          chapterUUID: chapter.uuid,
          orderInChapter: chapter.lessons.indexOf(lesson) + 1,
        });
        
        if (lessonData.readme && lessonData.readme.length > 0) {
          totalWithContent++;
        }
      }
    }
  }

  if (courseLessons.length > 0) {
    fs.writeFileSync(
      path.join(LESSONS_DIR, `${slug}.json`),
      JSON.stringify(courseLessons, null, 2)
    );
    courseFilesGenerated++;
  }
}

// Generate summary
const courseSummary = Object.entries(courses).map(([uuid, c]) => ({
  uuid,
  slug: c.slug,
  title: c.title || c.Title,
  lessonCount: c.lessonCount || 0,
  hours: c.hours || c.EstimatedCompletionTimeHours || 0,
  type: c.type || c.TypeDescription || "Course",
  chapters: (c.chapters || []).length,
}));

fs.writeFileSync(
  path.join(DATA_DIR, "course-summary.json"),
  JSON.stringify(courseSummary, null, 2)
);

console.log(`✅ Generated ${courseFilesGenerated} per-course lesson files`);
console.log(`✅ Total lessons with content: ${totalWithContent}`);
console.log(`✅ Course summary saved`);
