/**
 * refetch-lessons.js
 * Re-fetches only lessons that don't have content yet (non type_code).
 * Uses the new extraction logic from scrape-api-v2.js
 */

const fs = require("fs");
const path = require("path");

const API_BASE = "https://api.boot.dev/v1";
const DATA_DIR = path.join(__dirname, "..", "data");

const BATCH_SIZE = 10;
const BATCH_DELAY = 300;

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

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

  if (type === "type_code" || type === "type_code_sql") {
    const data = lesson.LessonDataCodeOutput;
    if (data) {
      result.readme = data.Readme || "";
      result.language = type === "type_code_sql" ? "sql" : (data.ProgLang || "");
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
  } else if (type === "type_choice") {
    const data = lesson.LessonDataMultipleChoice;
    if (data) {
      result.readme = data.Readme || "";
      if (data.Question) {
        result.question = {
          question: data.Question.Question,
          answers: data.Question.Answers || [],
          correctAnswer: data.Question.Answer,
        };
      }
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
      result.textInputConfig = data.TextInputData || data.TextInputConfig || {};
    }
  } else if (type === "type_interview_chat") {
    const data = lesson.LessonDataInterviewChat;
    if (data) {
      result.readme = data.Readme || "";
      result.interviewData = data.InterviewChatData || data.InterviewData || {};
    }
  } else if (type === "type_github_checks") {
    const data = lesson.LessonDataGithubChecks;
    if (data) {
      result.readme = data.Readme || "";
      result.githubChecksData = data.GithubCheckData || data.GithubChecksData || data;
    }
  } else {
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
  const refetchFile = path.join(DATA_DIR, "refetch-uuids.json");
  const lessonsFile = path.join(DATA_DIR, "lessons-api.json");

  if (!fs.existsSync(refetchFile)) {
    console.log("No refetch list found.");
    return;
  }

  const refetchUUIDs = JSON.parse(fs.readFileSync(refetchFile, "utf8"));
  const lessons = JSON.parse(fs.readFileSync(lessonsFile, "utf8"));
  
  console.log(`🔄 Re-fetching ${refetchUUIDs.length} lessons...\n`);

  let completed = 0;

  for (let i = 0; i < refetchUUIDs.length; i += BATCH_SIZE) {
    const batch = refetchUUIDs.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (uuid) => {
      try {
        const data = await fetchJSON(`${API_BASE}/static/lessons/${uuid}`);
        if (data.Lesson) {
          lessons[uuid] = extractLessonContent(data.Lesson);
        }
      } catch (err) {
        // Keep existing data on error
      }
    });

    await Promise.all(promises);
    completed += batch.length;

    if (completed % 200 === 0 || i + BATCH_SIZE >= refetchUUIDs.length) {
      fs.writeFileSync(lessonsFile, JSON.stringify(lessons, null, 2));
      
      const withReadme = Object.values(lessons).filter((l) => l.readme && l.readme.length > 0).length;
      console.log(`  💾 ${completed}/${refetchUUIDs.length} — ${withReadme} have readme`);
    }

    await new Promise((r) => setTimeout(r, BATCH_DELAY));
  }

  // Final stats
  const withReadme = Object.values(lessons).filter((l) => l.readme && l.readme.length > 0);
  const withCode = Object.values(lessons).filter((l) => l.starterFiles && l.starterFiles.length > 0);
  const withChoices = Object.values(lessons).filter((l) => l.question);

  console.log(`\n${"=".repeat(50)}`);
  console.log("✅ RE-FETCH COMPLETE");
  console.log(`${"=".repeat(50)}`);
  console.log(`  With readme: ${withReadme.length}/${Object.keys(lessons).length}`);
  console.log(`  With code: ${withCode.length}`);
  console.log(`  With choices: ${withChoices.length}`);
  console.log(`  Saved to: data/lessons-api.json`);
}

main().catch(console.error);
