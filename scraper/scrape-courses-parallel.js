/**
 * scrape-courses-parallel.js
 * Parallel version — uses multiple browser contexts for speed.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const CONCURRENCY = 3;

async function scrapeCourse(page, slug) {
  const url = `https://www.boot.dev/courses/${slug}`;
  
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2500);

    const courseData = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      const chapterListMatch = bodyText.match(
        /Chapter List\n((?:\d+\n[^\n]+\n[^\n]+\n?)+)/
      );

      const chapters = [];
      if (chapterListMatch) {
        const chapterSection = chapterListMatch[1];
        const chapterRegex = /(\d+)\n([^\n]+)\n([^\n]+)/g;
        let match;
        while ((match = chapterRegex.exec(chapterSection)) !== null) {
          chapters.push({
            number: parseInt(match[1]),
            title: match[2].trim(),
            description: match[3].trim(),
          });
        }
      }

      const courseName = document.querySelector("h1")?.textContent?.trim() || "";
      const hoursMatch = bodyText.match(/(\d+)\s*Hours?/);
      const lessonsMatch = bodyText.match(/(\d+)\s*(Addicting\s*)?lessons?/);
      const studentsMatch = bodyText.match(/Join\s+([\d,]+)\s+students/);
      const ratingMatch = document.querySelector("[class*='rating']")?.textContent?.trim();
      
      // Detect course type
      let courseType = "course";
      if (bodyText.includes("Guided Project")) courseType = "guided_project";
      if (bodyText.includes("Portfolio Project")) courseType = "portfolio_project";

      return {
        title: courseName || bodyText.split("\n")[0]?.trim(),
        courseType,
        hours: hoursMatch ? parseInt(hoursMatch[1]) : null,
        lessonCount: lessonsMatch ? parseInt(lessonsMatch[1]) : null,
        students: studentsMatch ? studentsMatch[1] : null,
        chapters,
        chapterCount: chapters.length,
        description: bodyText.substring(0, 500),
      };
    });

    // Try to extract from HTML for specific metadata
    const html = await page.content();
    
    // Find Nuxt data payload
    let nuxtPayload = null;
    try {
      const match = html.match(/<script>window\.__NUXT__\s*=\s*(.*?)<\/script>/);
      if (match) nuxtPayload = match[1].substring(0, 200);
    } catch (e) {}

    return {
      slug,
      url,
      ...courseData,
    };
  } catch (error) {
    return { slug, url, error: error.message, chapters: [] };
  }
}

async function main() {
  console.log("🚀 Parallel course scraper...\n");

  // Load slugs
  const slugsFile = path.join(DATA_DIR, "course-slugs.json");
  let courseSlugs = fs.existsSync(slugsFile)
    ? JSON.parse(fs.readFileSync(slugsFile, "utf8"))
    : [];

  const extraCourses = [
    "learn-http-protocol-golang", "learn-git-2", "learn-cryptography-golang",
    "learn-data-structures-and-algorithms-python-2", "learn-http-servers-typescript",
    "learn-http-clients-python", "learn-pub-sub-rabbitmq-typescript",
    "learn-ci-cd-github-docker-typescript", "build-web-scraper-python",
    "build-web-scraper-golang", "build-web-scraper-typescript",
    "build-maze-solver-python", "build-personal-project-2",
    "learn-ci-cd-github-docker-golang", "learn-pub-sub-rabbitmq-golang",
    "learn-retrieval-augmented-generation", "learn-data-visualization-power-bi",
  ];
  const allSlugs = [...new Set([...courseSlugs, ...extraCourses])];

  // Resume progress
  const outputFile = path.join(DATA_DIR, "course-details.json");
  let results = {};
  if (fs.existsSync(outputFile)) {
    results = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  }

  // Filter to slugs needing (re)scrape
  const toScrape = allSlugs.filter(
    (s) => !results[s] || !results[s].chapters || results[s].chapters.length === 0
  );

  console.log(
    `Total: ${allSlugs.length} | Done: ${allSlugs.length - toScrape.length} | Remaining: ${toScrape.length}\n`
  );

  if (toScrape.length === 0) {
    console.log("✅ All courses already scraped!");
    return;
  }

  // Launch browser with multiple pages
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
    });
    pages.push(await context.newPage());
  }

  let completed = 0;

  // Process in batches
  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    const promises = batch.map((slug, idx) =>
      scrapeCourse(pages[idx % CONCURRENCY], slug).then((result) => {
        results[slug] = result;
        completed++;
        const chapterInfo = result.chapters
          ? `[${result.chapters.length} chapters]`
          : "[no chapters]";
        console.log(
          `  [${completed}/${toScrape.length}] ${slug} ${chapterInfo}`
        );
      })
    );

    await Promise.all(promises);

    // Save after each batch
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    // Rate limit between batches
    await new Promise((r) => setTimeout(r, 500));
  }

  // Close all pages
  for (const page of pages) {
    await page.context().close();
  }
  await browser.close();

  // Summary
  const withChapters = Object.values(results).filter(
    (r) => r.chapters && r.chapters.length > 0
  ).length;
  const totalLessons = Object.values(results).reduce(
    (sum, r) => sum + (r.lessonCount || 0), 0
  );
  const totalHours = Object.values(results).reduce(
    (sum, r) => sum + (r.hours || 0), 0
  );

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ SCRAPING COMPLETE`);
  console.log(`${"=".repeat(50)}`);
  console.log(`  Courses with chapters: ${withChapters}/${Object.keys(results).length}`);
  console.log(`  Total lessons: ${totalLessons}`);
  console.log(`  Total hours: ${totalHours}`);
  console.log(`  Data saved to: data/course-details.json`);
}

main().catch(console.error);
