/**
 * scrape-courses-v2.js
 * Improved scraper that inspects actual DOM structure
 * to find chapter lists on boot.dev course pages.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

async function scrapeCourse(browser, slug) {
  const url = `https://www.boot.dev/courses/${slug}`;
  console.log(`  Scraping: ${url}`);

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Additional wait for hydration
    await page.waitForTimeout(3000);

    const pageTitle = await page.title();

    // Extract course data by examining the actual DOM
    const courseData = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Extract chapter list section
      const chapterListMatch = bodyText.match(
        /Chapter List\n((?:\d+\n[^\n]+\n[^\n]+\n?)+)/
      );
      
      const chapters = [];
      if (chapterListMatch) {
        const chapterSection = chapterListMatch[1];
        // Match each chapter: number, title, description
        const chapterRegex = /(\d+)\n([^\n]+)\n([^\n]+)/g;
        let match;
        while ((match = chapterRegex.exec(chapterSection)) !== null) {
          chapters.push({
            number: match[1],
            title: match[2].trim(),
            description: match[3].trim(),
          });
        }
      }

      // Also try to find chapters using DOM structure
      // Look for elements that contain chapter-like content
      const allElements = document.querySelectorAll("*");
      const chapterElements = [];
      
      // Try Nuxt data
      let nuxtData = null;
      const nuxtEl = document.querySelector("#__NUXT_DATA__");
      if (nuxtEl) {
        try {
          nuxtData = JSON.parse(nuxtEl.textContent);
        } catch (e) {}
      }

      // Try to extract from rendered DOM
      // Look for divs containing chapter numbers and lessons
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (text && text.length > 0 && text.length < 500) {
          textNodes.push({
            text: text,
            tag: node.parentElement?.tagName,
            className: node.parentElement?.className,
          });
        }
      }

      // Extract metadata from page
      const courseName = document.querySelector("h1")?.textContent?.trim() || "";
      const hoursMatch = bodyText.match(/(\d+)\s*Hours?/);
      const lessonsMatch = bodyText.match(/(\d+)\s*(Addicting\s*)?lessons?/);
      const studentsMatch = bodyText.match(/Join\s+([\d,]+)\s+students/);

      return {
        courseName,
        hours: hoursMatch ? parseInt(hoursMatch[1]) : null,
        lessonCount: lessonsMatch ? parseInt(lessonsMatch[1]) : null,
        students: studentsMatch ? studentsMatch[1] : null,
        chapters: chapters,
        chapterCount: chapters.length,
        textNodes: textNodes.slice(0, 100), // Just first 100 for debugging
        nuxtData: nuxtData ? "(present)" : null,
      };
    });

    console.log(
      `    ✓ ${courseData.chapterCount} chapters, ${courseData.lessonCount} lessons, ${courseData.hours}h`
    );

    return {
      slug,
      url,
      title: pageTitle,
      ...courseData,
    };
  } catch (error) {
    console.error(`    ✗ Error: ${error.message}`);
    return { slug, url, error: error.message };
  } finally {
    await context.close();
  }
}

/**
 * Helper: scrape a single page for DOM debugging
 */
async function debugScrape(slug) {
  console.log(`🔍 Debug scraping: ${slug}`);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const result = await scrapeCourse(browser, slug);
  await browser.close();

  return result;
}

async function main() {
  if (process.argv[2] === "--debug") {
    const slug = process.argv[3] || "learn-code-python";
    const result = await debugScrape(slug);
    fs.writeFileSync(
      path.join(DATA_DIR, `debug-${slug}.json`),
      JSON.stringify(result, null, 2)
    );
    console.log(`\nDebug data saved to data/debug-${slug}.json`);
    
    // Print chapter data
    if (result.chapters) {
      console.log(`\nChapters found: ${result.chapters.length}`);
      result.chapters.forEach((ch) => {
        console.log(`  ${ch.number}. ${ch.title}`);
      });
    }
    return;
  }

  // Full scrape mode
  console.log("🚀 Starting course scraper v2...\n");

  const slugsFile = path.join(DATA_DIR, "course-slugs.json");
  const courseSlugs = fs.existsSync(slugsFile)
    ? JSON.parse(fs.readFileSync(slugsFile, "utf8"))
    : [];

  // Merge with extra courses
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

  console.log(`Total: ${allSlugs.length} courses to scrape\n`);

  // Resume from existing data
  const outputFile = path.join(DATA_DIR, "course-details.json");
  let results = {};
  if (fs.existsSync(outputFile)) {
    results = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let newCount = 0;
  for (const slug of allSlugs) {
    // Re-scrape if no chapters found in previous run
    if (results[slug] && results[slug].chapters && results[slug].chapters.length > 0) {
      console.log(`  ⏭ Skipping ${slug} (already has chapters)`);
      continue;
    }

    newCount++;
    results[slug] = await scrapeCourse(browser, slug);

    // Save incrementally
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

    if (newCount % 5 === 0) {
      console.log(`  💾 Progress saved (${newCount} new)\n`);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
  }

  await browser.close();

  const total = Object.values(results).filter(
    (r) => r.chapters && r.chapters.length > 0
  ).length;
  console.log(`\n✅ Complete. ${total}/${Object.keys(results).length} courses have chapters.`);
}

main().catch(console.error);
