/**
 * fix-missing-lessons.js
 * Re-fetches the 119 lessons with wrong data keys:
 * - type_code_sql → LessonDataCodeSQL (not LessonDataCodeOutput)
 * - type_github_checks → LessonDataGitHubChecks (not LessonDataGithubChecks)
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.boot.dev/v1";
const DATA_DIR = path.join(__dirname, "..", "data");

const BATCH = 10;

async function fetchJSON(url) {
  return fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));
}

function extractLesson(lesson) {
  const type = lesson.Type;
  const base = {
    uuid: lesson.UUID, slug: lesson.Slug, title: lesson.Title,
    type, topics: lesson.Topics || [],
    courseUUID: lesson.CourseUUID, courseSlug: lesson.CourseSlug,
    courseTitle: lesson.CourseTitle, chapterUUID: lesson.ChapterUUID,
    chapterTitle: lesson.ChapterTitle, isFree: lesson.IsFree,
    difficulty: lesson.AbsoluteDifficulty, readme: "", language: "",
  };

  if (type === "type_code" || type === "type_code_tests") {
    const data = lesson.LessonDataCodeOutput || lesson.LessonDataCodeTests;
    if (data) {
      base.readme = data.Readme || "";
      base.language = data.ProgLang || "";
      base.starterFiles = (data.StarterFiles || []).map(f => ({
        name: f.Name, content: f.Content,
        isHidden: f.IsHidden || false, isReadonly: f.IsReadonly || false,
      }));
    }
  } else if (type === "type_code_sql") {
    // FIX: key is LessonDataCodeSQL
    const data = lesson.LessonDataCodeSQL;
    if (data) {
      base.readme = data.Readme || "";
      base.language = "sql";
      base.starterFiles = (data.StarterFiles || []).map(f => ({
        name: f.Name, content: f.Content,
        isHidden: f.IsHidden || false, isReadonly: f.IsReadonly || false,
      }));
    }
  } else if (type === "type_github_checks") {
    // FIX: key is LessonDataGitHubChecks (capital H)
    const data = lesson.LessonDataGitHubChecks;
    if (data) {
      base.readme = data.Readme || "";
      base.githubChecksData = data.GitHubChecks || {};
    }
  } else if (type === "type_choice") {
    const data = lesson.LessonDataMultipleChoice;
    if (data) {
      base.readme = data.Readme || "";
      if (data.Question) base.question = {
        question: data.Question.Question,
        answers: data.Question.Answers || [],
        correctAnswer: data.Question.Answer,
      };
    }
  } else if (type === "type_cli") {
    const data = lesson.LessonDataCLI;
    if (data) { base.readme = data.Readme || ""; base.cliData = data.CLIData || {}; }
  } else if (type === "type_text_input") {
    const data = lesson.LessonDataTextInput;
    if (data) { base.readme = data.Readme || ""; }
  } else if (type === "type_interview_chat") {
    const data = lesson.LessonDataInterviewChat;
    if (data) { base.readme = data.Readme || ""; }
  }

  return base;
}

async function main() {
  const lessonsFile = path.join(DATA_DIR, "lessons-api.json");
  let lessons = JSON.parse(fs.readFileSync(lessonsFile, "utf8"));

  // Find missing
  const missing = [];
  for (const [uuid, l] of Object.entries(lessons)) {
    if (!l.readme || l.readme.length === 0) missing.push(uuid);
  }

  if (missing.length === 0) {
    console.log("✅ No missing lessons!");
    return;
  }

  console.log(`🔧 Fixing ${missing.length} missing lessons...\n`);

  let fixed = 0;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (uuid) => {
        try {
          const data = await fetchJSON(`${API_BASE}/static/lessons/${uuid}`);
          if (data.Lesson) return { uuid, lesson: extractLesson(data.Lesson) };
        } catch (e) {}
        return null;
      })
    );

    for (const r of results.filter(Boolean)) {
      lessons[r.uuid] = r.lesson;
      fixed++;
    }

    fs.writeFileSync(lessonsFile, JSON.stringify(lessons, null, 2));
    console.log(`  💾 ${fixed}/${missing.length} fixed`);
    await new Promise((r) => setTimeout(r, 300));
  }

  // Final count
  const withReadme = Object.values(lessons).filter(l => l.readme && l.readme.length > 0).length;
  console.log(`\n✅ Done. ${withReadme}/${Object.keys(lessons).length} have readme (${((withReadme / Object.keys(lessons).length) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
