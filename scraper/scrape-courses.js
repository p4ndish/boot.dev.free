/**
 * scrape-courses.js
 * Uses Playwright to scrape boot.dev course pages for:
 * - Chapter names and descriptions
 * - Lesson titles
 * - Published course metadata
 *
 * Boot.dev's course pages are Nuxt.js SPAs - JS rendering is required.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const OUTPUT_FILE = path.join(DATA_DIR, "course-details.json");

// Additional courses not covered by the curriculum repo (found on /courses page)
const EXTRA_COURSES = [
  "learn-http-protocol-golang",
  "learn-git-2",
  "learn-cryptography-golang",
  "learn-data-structures-and-algorithms-python-2",
  "learn-http-servers-typescript",
  "learn-http-clients-python",
  "learn-pub-sub-rabbitmq-typescript",
  "learn-ci-cd-github-docker-typescript",
  "build-web-scraper-python",
  "build-web-scraper-golang",
  "build-web-scraper-typescript",
  "build-blog-aggregator-typescript",
  "build-maze-solver-python",
  "build-personal-project-2",
  "learn-ci-cd-github-docker-golang",
  "learn-file-servers-s3-cloudfront-typescript",
  "learn-pub-sub-rabbitmq-golang",
  "learn-logging-observability-golang",
  "learn-aws",
  "learn-retrieval-augmented-generation",
  "learn-data-visualization-power-bi",
];

async function scrapeCourse(page, slug) {
  const url = `https://www.boot.dev/courses/${slug}`;
  console.log(`  Scraping: ${url}`);

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for course content to render
    await page.waitForSelector("h1, .course-title, [class*='course']", {
      timeout: 10000,
    }).catch(() => {});

    // Extract page text for analysis
    const pageText = await page.evaluate(() => document.body.innerText);
    const pageTitle = await page.title();

    // Try to extract structured data from Nuxt/Vue components
    const courseData = await page.evaluate(() => {
      // Look for chapter elements (various potential selectors)
      const chapterElements = document.querySelectorAll(
        "[data-chapter], .chapter-item, .chapter, .accordion-item, [class*='chapter']"
      );

      const chapters = [];

      if (chapterElements.length > 0) {
        chapterElements.forEach((el) => {
          const titleEl =
            el.querySelector("h3, h4, .chapter-title, [class*='chapter-title']") || el;
          const lessonEls = el.querySelectorAll(
            ".lesson-item, .lesson, li, [class*='lesson']"
          );

          const lessons = [];
          lessonEls.forEach((l) => {
            const lessonText = l.textContent.trim();
            if (lessonText && lessonText.length > 2) {
              lessons.push(lessonText);
            }
          });

          chapters.push({
            title: titleEl.textContent.trim(),
            lessons: lessons,
          });
        });
      }

      // Try Nuxt rendered data
      const nuxtData = document.querySelector("#__NUXT_DATA__");
      let nuxtState = null;
      if (nuxtData) {
        try {
          nuxtState = JSON.parse(nuxtData.textContent);
        } catch (e) {}
      }

      return { chapters, nuxtState };
    });

    // Build result from extracted data
    const result = {
      slug: slug,
      url: url,
      title: pageTitle,
      chapters: courseData.chapters.length > 0 ? courseData.chapters : [],
      has_chapters: courseData.chapters.length > 0,
      page_text_preview: pageText.substring(0, 2000),
    };

    // If we got chapters, structure them
    if (result.chapters.length > 0) {
      console.log(
        `    ✓ Found ${result.chapters.length} chapters with ${result.chapters.reduce(
          (sum, ch) => sum + ch.lessons.length,
          0
        )} total lessons`
      );
    } else {
      console.log(`    ⚠ No structured chapters found, saving page text`);
    }

    return result;
  } catch (error) {
    console.error(`    ✗ Error scraping ${slug}: ${error.message}`);
    return {
      slug: slug,
      url: url,
      error: error.message,
      chapters: [],
    };
  }
}

async function main() {
  console.log("🚀 Starting course scraper...\n");

  // Load course slugs
  let courseSlugs;
  if (fs.existsSync(COURSES_FILE)) {
    const courses = JSON.parse(fs.readFileSync(COURSES_FILE, "utf8"));
    courseSlugs = courses.map((c) => c.slug).filter(Boolean);
    console.log(`Loaded ${courseSlugs.length} courses from curriculum\n`);
  } else {
    console.log("No courses.json found. Run parse-curriculum.js first.");
    return;
  }

  // Add extra courses
  const allSlugs = [...new Set([...courseSlugs, ...EXTRA_COURSES])];
  console.log(`Total courses to scrape: ${allSlugs.length}\n`);

  // Load existing progress
  let results = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    results = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    console.log(`Resuming from existing data (${Object.keys(results).length} courses)\n`);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Scrape each course (with delay to be respectful)
  let count = 0;
  for (const slug of allSlugs) {
    if (results[slug]) {
      console.log(`  ⏭ Skipping ${slug} (already scraped)`);
      continue;
    }

    count++;
    results[slug] = await scrapeCourse(page, slug);

    // Save incrementally
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    // Be respectful with rate limiting
    if (count % 5 === 0) {
      console.log(`\n  💾 Saved progress (${count} new courses scraped)\n`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await browser.close();

  console.log(`\n✅ Scraping complete. ${Object.keys(results).length} courses saved to data/course-details.json`);
}

main().catch(console.error);
