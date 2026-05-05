/**
 * scrape-api-v2.js
 * Complete scraper handling ALL lesson types.
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.boot.dev/v1";
const DATA_DIR = path.join(__dirname, "..", "data");

const BATCH_SIZE = 8;
const BATCH_DELAY = 300;
const REQUEST_DELAY = 100;

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Map lesson type → data key + extraction logic
 */
function extractLessonContent(lesson) {
  const type = lesson.Type;
  const result = {
    uuid: lesson.UUID,
    slug: lesson.Slug,
    title: lesson.Title,
    type: type,
    topics: lesson.Topics || [],
    courseUUID: lesson.CourseUUID,
    courseSlug: lesson.CourseSlug,
    courseTitle: lesson.CourseTitle,
    chapterUUID: lesson.ChapterUUID,
    chapterTitle: lesson.ChapterTitle,
    isFree: lesson.IsFree,
    difficulty: lesson.AbsoluteDifficulty,
    readme: "",
    language: "",
  };

  // Handle each type
  if (type === "type_code") {
    const data = lesson.LessonDataCodeOutput;
    if (data) {
      result.readme = data.Readme || "";
      result.language = data.ProgLang || "";
      result.starterFiles = (data.StarterFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
        isHidden: f.IsHidden || false, isReadonly: f.IsReadonly || false,
      }));
      result.solutionFiles = (data.SolutionFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
      }));
      result.expectedOutput = data.CodeExpectedOutput || "";
    }
  } else if (type === "type_code_tests") {
    const data = lesson.LessonDataCodeTests;
    if (data) {
      result.readme = data.Readme || "";
      result.language = data.ProgLang || "";
      result.starterFiles = (data.StarterFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
        isHidden: f.IsHidden || false, isReadonly: f.IsReadonly || false,
      }));
      result.solutionFiles = (data.SolutionFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
      }));
    }
  } else if (type === "type_code_sql") {
    const data = lesson.LessonDataCodeOutput;
    if (data) {
      result.readme = data.Readme || "";
      result.language = "sql";
      result.starterFiles = (data.StarterFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
        isHidden: f.IsHidden || false, isReadonly: f.IsReadonly || false,
      }));
      result.solutionFiles = (data.SolutionFiles || []).map((f) => ({
        name: f.Name, content: f.Content,
      }));
      result.expectedOutput = data.CodeExpectedOutput || "";
    }
  } else if (type === "type_choice") {
    const data = lesson.LessonDataMultipleChoice;
    if (data) {
      result.readme = data.Readme || "";
      result.question = data.Question ? {
        question: data.Question.Question,
        answers: data.Question.Answers || [],
        correctAnswer: data.Question.Answer,
      } : null;
    }
  } else if (type === "type_cli") {
    const data = lesson.LessonDataCLI;
    if (data) {
      result.readme = data.Readme || "";
      result.cliData = data.CLIData || {};
    }
  } else if (type === "type_text_input") {
    const data = lesson.LessonDataTextInput;
    if (data) {
      result.readme = data.Readme || "";
      result.textInputData = data.TextInputData || {};
    }
  } else if (type === "type_interview_chat") {
    const data = lesson.LessonDataInterviewChat;
    if (data) {
      result.readme = data.Readme || "";
      result.interviewData = data.InterviewChatData || {};
    }
  } else if (type === "type_github_checks") {
    const data = lesson.LessonDataGithubChecks;
    if (data) {
      result.readme = data.Readme || "";
      result.githubChecksData = data.GithubChecksData || data;
    }
  } else {
    // Unknown type — try all LessonData keys
    for (const key of Object.keys(lesson)) {
      if (key.startsWith("LessonData")) {
        const data = lesson[key];
        if (data && data.Readme) result.readme = data.Readme;
        if (data && data.ProgLang) result.language = data.ProgLang;
      }
    }
  }

  return result;
}

async function main() {
  console.log("🚀 API Scraper v2 — all lesson types\n");
  console.log(`${"=".repeat(50)}\n`);

  // Load existing data
  const coursesFile = path.join(DATA_DIR, "courses-api.json");
  const lessonsFile = path.join(DATA_DIR, "lessons-api.json");

  if (!fs.existsSync(coursesFile)) {
    console.log("Run scrape-api.js first to get course data!");
    return;
  }

  const courses = JSON.parse(fs.readFileSync(coursesFile, "utf8"));

  // Collect all lesson UUIDs with type info
  const lessonRefs = [];
  for (const course of Object.values(courses)) {
    for (const ch of course.chapters || []) {
      for (const lesson of ch.lessons || []) {
        lessonRefs.push({
          uuid: lesson.uuid,
          type: lesson.type,
          courseSlug: course.slug,
          courseTitle: course.title,
          chapterTitle: ch.title,
          lessonTitle: lesson.title,
        });
      }
    }
  }

  console.log(`Total lessons: ${lessonRefs.length}`);
  const typeCounts = {};
  lessonRefs.forEach((l) => {
    typeCounts[l.type] = (typeCounts[l.type] || 0) + 1;
  });
  console.log("By type:", JSON.stringify(typeCounts, null, 2));
  console.log();

  // Resume existing
  let lessons = {};
  if (fs.existsSync(lessonsFile)) {
    lessons = JSON.parse(fs.readFileSync(lessonsFile, "utf8"));
    console.log(`Resuming — ${Object.keys(lessons).length} already fetched\n`);
  }

  const toFetch = lessonRefs.filter((l) => !lessons[l.uuid] || lessons[l.uuid].error);
  console.log(`Need to fetch: ${toFetch.length} lessons\n`);

  if (toFetch.length === 0) {
    console.log("All lessons already fetched!");
    return;
  }

  let completed = 0;
  const lessonsDir = path.join(DATA_DIR, "lessons");
  if (!fs.existsSync(lessonsDir)) fs.mkdirSync(lessonsDir, { recursive: true });

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (ref) => {
      try {
        const data = await fetchJSON(`${API_BASE}/static/lessons/${ref.uuid}`);
        if (data.Lesson) {
          lessons[ref.uuid] = extractLessonContent(data.Lesson);
        } else {
          lessons[ref.uuid] = { uuid: ref.uuid, error: "No Lesson data" };
        }
      } catch (err) {
        lessons[ref.uuid] = { uuid: ref.uuid, error: err.message };
      }
    });

    await Promise.all(promises);
    completed += batch.length;

    if (completed % 100 === 0 || i + BATCH_SIZE >= toFetch.length) {
      fs.writeFileSync(lessonsFile, JSON.stringify(lessons, null, 2));
      console.log(`  💾 ${completed}/${toFetch.length} lessons saved`);
    }

    await new Promise((r) => setTimeout(r, BATCH_DELAY));
  }

  // Generate per-course lesson files
  console.log("\n📦 Generating per-course files...");
  for (const course of Object.values(courses)) {
    const courseLessons = [];
    for (const ch of course.chapters || []) {
      for (const l of ch.lessons || []) {
        if (lessons[l.uuid] && !lessons[l.uuid].error) {
          courseLessons.push({
            ...lessons[l.uuid],
            chapterTitle: ch.title,
            orderInChapter: ch.lessons.indexOf(l),
          });
        }
      }
    }
    if (courseLessons.length > 0) {
      fs.writeFileSync(
        path.join(lessonsDir, `${course.slug}.json`),
        JSON.stringify(courseLessons, null, 2)
      );
    }
  }

  // Summary
  const withReadme = Object.values(lessons).filter((l) => l.readme && l.readme.length > 0);
  const withCode = Object.values(lessons).filter((l) => l.starterFiles && l.starterFiles.length > 0);
  const errors = Object.values(lessons).filter((l) => l.error);

  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 FINAL SUMMARY");
  console.log(`${"=".repeat(50)}`);
  console.log(`  Total lessons fetched: ${Object.keys(lessons).length}`);
  console.log(`  With readme content: ${withReadme.length}`);
  console.log(`  With starter code: ${withCode.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`\n  All data in: data/lessons-api.json`);
  console.log(`  Per-course files in: data/lessons/`);
}

main().catch(console.error);
