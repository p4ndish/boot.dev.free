/**
 * scrape-api.js
 * Uses boot.dev's public/static API to fetch ALL course and lesson data.
 * 
 * Pipeline:
 *   1. GET /v1/static/paths → extract all CourseUUIDs
 *   2. GET /v1/courses/{uuid} → extract all LessonUUIDs + chapters
 *   3. GET /v1/static/lessons/{uuid} → extract full lesson content
 * 
 * All data saved to data/ directory.
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.boot.dev/v1";
const DATA_DIR = path.join(__dirname, "..", "data");

// Rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY = 500;
const REQUEST_DELAY = 200;

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }
  return resp.json();
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Step 1: Fetch all paths and extract course UUIDs
 */
async function fetchAllPaths() {
  console.log("📊 Step 1: Fetching paths...");
  const paths = await fetchJSON(`${API_BASE}/static/paths`);
  
  const courseUUIDs = new Set();
  const pathData = [];
  
  for (const p of paths) {
    const cuuids = [...(p.CourseUUIDs || []), ...(p.RecommendedCourseUUIDs || [])];
    cuuids.forEach((id) => courseUUIDs.add(id));
    
    pathData.push({
      uuid: p.UUID,
      slug: p.Slug,
      title: p.Title,
      description: p.ShortDescription,
      technologies: p.DifferentiatingTechnologies,
      courseUUIDs: p.CourseUUIDs || [],
      recommendedCourseUUIDs: p.RecommendedCourseUUIDs || [],
      estimatedMonths: p.EstimatedCompletionTimeMonths,
    });
  }
  
  fs.writeFileSync(
    path.join(DATA_DIR, "paths-api.json"),
    JSON.stringify(pathData, null, 2)
  );
  
  console.log(`  ✅ ${paths.length} paths, ${courseUUIDs.size} unique course UUIDs`);
  return { paths: pathData, courseUUIDs: [...courseUUIDs] };
}

/**
 * Step 2: Fetch each course to get chapters and lesson UUIDs
 */
async function fetchAllCourses(courseUUIDs) {
  console.log(`\n📚 Step 2: Fetching ${courseUUIDs.length} courses...`);
  
  const outputFile = path.join(DATA_DIR, "courses-api.json");
  
  // Resume from existing
  let courses = {};
  if (fs.existsSync(outputFile)) {
    courses = JSON.parse(fs.readFileSync(outputFile, "utf8"));
    console.log(`  Resuming — ${Object.keys(courses).length} already fetched`);
  }
  
  const toFetch = courseUUIDs.filter((id) => !courses[id]);
  
  if (toFetch.length === 0) {
    console.log("  ✅ All courses already fetched!");
    return courses;
  }
  
  let fetched = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const uuid = toFetch[i];
    try {
      const course = await fetchJSON(`${API_BASE}/courses/${uuid}`);
      courses[uuid] = {
        uuid: course.UUID,
        slug: course.Slug,
        title: course.Title,
        shortDescription: course.ShortDescription,
        description: course.Description,
        hours: course.EstimatedCompletionTimeHours,
        lessonCount: course.NumLessons,
        type: course.TypeDescription,
        status: course.Status,
        lastUpdated: course.LastUpdated,
        chapters: (course.Chapters || []).map((ch) => ({
          uuid: ch.UUID,
          slug: ch.Slug,
          title: ch.Title,
          description: ch.Description,
          lessons: (ch.Lessons || []).map((l) => ({
            uuid: l.UUID,
            slug: l.Slug,
            title: l.Title,
            type: l.Type,
            topics: l.Topics || [],
            isFree: l.IsFree || false,
            difficulty: l.AbsoluteDifficulty,
            lastMod: l.LastMod,
          })),
        })),
      };
      
      fetched++;
      const totalLessons = course.Chapters?.reduce(
        (sum, ch) => sum + (ch.Lessons?.length || 0), 0
      ) || 0;
      
      console.log(`  [${fetched}/${toFetch.length}] ${course.Title || uuid.substring(0,8)} — ${totalLessons} lessons`);
      
      // Save incrementally
      fs.writeFileSync(outputFile, JSON.stringify(courses, null, 2));
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
    
    await delay(REQUEST_DELAY);
  }
  
  console.log(`  ✅ ${Object.keys(courses).length} courses saved`);
  return courses;
}

/**
 * Step 3: Fetch lesson content
 */
async function fetchAllLessons(courses) {
  console.log(`\n📝 Step 3: Fetching lesson content...`);
  
  // Collect all lesson UUIDs
  const lessonUUIDs = [];
  for (const course of Object.values(courses)) {
    for (const chapter of course.chapters || []) {
      for (const lesson of chapter.lessons || []) {
        lessonUUIDs.push({
          uuid: lesson.uuid,
          courseSlug: course.slug,
          courseTitle: course.title,
          chapterTitle: chapter.title,
          lessonTitle: lesson.title,
          lessonType: lesson.type,
        });
      }
    }
  }
  
  console.log(`  Total lessons to fetch: ${lessonUUIDs.length}`);
  
  const outputFile = path.join(DATA_DIR, "lessons-api.json");
  const lessonsDir = path.join(DATA_DIR, "lessons");
  if (!fs.existsSync(lessonsDir)) fs.mkdirSync(lessonsDir, { recursive: true });
  
  // Resume
  let lessons = {};
  if (fs.existsSync(outputFile)) {
    lessons = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  }
  
  const toFetch = lessonUUIDs.filter((l) => !lessons[l.uuid]);
  
  if (toFetch.length === 0) {
    console.log("  ✅ All lessons already fetched!");
    return lessons;
  }
  
  console.log(`  Fetching ${toFetch.length} lessons...`);
  
  let count = 0;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (lessonInfo) => {
      try {
        const data = await fetchJSON(`${API_BASE}/static/lessons/${lessonInfo.uuid}`);
        
        if (data.Lesson) {
          const lesson = data.Lesson;
          const ldo = lesson.LessonDataCodeOutput || {};
          
          lessons[lessonInfo.uuid] = {
            uuid: lesson.UUID,
            slug: lesson.Slug,
            title: lesson.Title,
            type: lesson.Type,
            topics: lesson.Topics || [],
            courseUUID: lesson.CourseUUID,
            courseSlug: lesson.CourseSlug,
            courseTitle: lesson.CourseTitle,
            chapterUUID: lesson.ChapterUUID,
            chapterTitle: lesson.ChapterTitle,
            isFree: lesson.IsFree,
            difficulty: lesson.AbsoluteDifficulty,
            language: ldo.ProgLang || "",
            readme: ldo.Readme || "",
            starterFiles: (ldo.StarterFiles || []).map((f) => ({
              name: f.Name,
              content: f.Content,
              isHidden: f.IsHidden || false,
              isReadonly: f.IsReadonly || false,
            })),
            solutionFiles: (ldo.SolutionFiles || []).map((f) => ({
              name: f.Name,
              content: f.Content,
            })),
            expectedOutput: ldo.CodeExpectedOutput || "",
          };
        }
      } catch (err) {
        lessons[lessonInfo.uuid] = {
          uuid: lessonInfo.uuid,
          error: err.message,
        };
      }
    });
    
    await Promise.all(promises);
    
    count += batch.length;
    if (count % 50 === 0 || i + BATCH_SIZE >= toFetch.length) {
      fs.writeFileSync(outputFile, JSON.stringify(lessons, null, 2));
      console.log(`  💾 Saved ${Object.keys(lessons).length} lessons (${count}/${toFetch.length})`);
    }
    
    await delay(BATCH_DELAY);
  }
  
  // Also save per-course lesson files
  for (const course of Object.values(courses)) {
    const courseLessons = {};
    for (const chapter of course.chapters || []) {
      for (const lesson of chapter.lessons || []) {
        if (lessons[lesson.uuid]) {
          courseLessons[lesson.uuid] = lessons[lesson.uuid];
        }
      }
    }
    
    if (Object.keys(courseLessons).length > 0) {
      fs.writeFileSync(
        path.join(lessonsDir, `${course.slug}.json`),
        JSON.stringify(courseLessons, null, 2)
      );
    }
  }
  
  const valid = Object.values(lessons).filter((l) => !l.error);
  console.log(`  ✅ ${valid.length}/${Object.keys(lessons).length} lessons with content`);
  return lessons;
}

/**
 * Generate summary stats
 */
function generateSummary(courses, lessons) {
  const validLessons = Object.values(lessons).filter((l) => !l.error && l.readme);
  const totalLessonCount = Object.values(courses).reduce(
    (sum, c) => sum + (c.lessonCount || 0), 0
  );
  const totalChapters = Object.values(courses).reduce(
    (sum, c) => sum + (c.chapters?.length || 0), 0
  );
  
  const byLanguage = {};
  for (const l of validLessons) {
    const lang = l.language || "unknown";
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;
  }
  
  const byType = {};
  for (const l of validLessons) {
    const type = l.type || "unknown";
    byType[type] = (byType[type] || 0) + 1;
  }
  
  const summary = {
    courses: Object.keys(courses).length,
    totalChapters,
    totalLessonCount,
    scrapedLessons: validLessons.length,
    byLanguage,
    byType,
  };
  
  fs.writeFileSync(
    path.join(DATA_DIR, "summary.json"),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 SUMMARY");
  console.log(`${"=".repeat(50)}`);
  console.log(`  Courses: ${summary.courses}`);
  console.log(`  Chapters: ${summary.totalChapters}`);
  console.log(`  Total lessons: ${summary.totalLessonCount}`);
  console.log(`  Scraped lessons: ${summary.scrapedLessons}`);
  console.log(`\n  By language:`, JSON.stringify(summary.byLanguage));
  console.log(`  By type:`, JSON.stringify(summary.byType));
}

async function main() {
  console.log("🚀 API-Based Scraper Pipeline\n");
  console.log(`${"=".repeat(50)}\n`);
  
  // Step 1
  const { paths, courseUUIDs } = await fetchAllPaths();
  
  // Step 2
  const courses = await fetchAllCourses(courseUUIDs);
  
  // Step 3
  const lessons = await fetchAllLessons(courses);
  
  // Summary
  generateSummary(courses, lessons);
  
  console.log(`\n✅ ALL DONE. Data in data/ directory.`);
}

main().catch(console.error);
