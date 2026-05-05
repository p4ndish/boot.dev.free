/**
 * discover-lesson-url.js
 * Various approaches to find the lesson view URL structure
 * and extract lesson content.
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

async function discover() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Collect network requests to find API endpoints
  const apiCalls = [];
  page.on("request", (req) => {
    if (req.url().includes("api.") || req.url().includes("lesson") || req.url().includes("course")) {
      apiCalls.push(`${req.method()} ${req.url().substring(0, 120)}`);
    }
  });

  // Approach 1: Demo page (no auth needed)
  console.log("\n=== APPROACH 1: Demo Page ===\n");
  await page.goto("https://www.boot.dev/demo", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);
  
  const demoHtml = await page.content();
  const demoText = await page.evaluate(() => document.body.innerText);
  
  fs.writeFileSync(path.join(DATA_DIR, "demo-html.txt"), demoHtml.substring(0, 100000));
  fs.writeFileSync(path.join(DATA_DIR, "demo-text.txt"), demoText.substring(0, 20000));
  
  console.log("Demo page URL:", page.url());
  console.log("Demo page title:", await page.title());
  console.log("Demo has editor:", !!(await page.$(".cm-editor, .CodeMirror")));
  console.log("Demo text preview:", demoText.substring(0, 500));

  // Extract any lesson content from demo page  
  const demoLessonData = await page.evaluate(() => {
    const cmContent = document.querySelector(".cm-content")?.textContent || "";
    const cmLines = Array.from(document.querySelectorAll(".cm-line")).map(l => l.textContent);
    const editorCode = cmLines.join("\n") || cmContent;
    
    // Find instruction text
    const bodyText = document.body.innerText;
    
    return {
      editorCode: editorCode.substring(0, 2000),
      bodyTextFirst: bodyText.substring(0, 1000),
    };
  });
  
  fs.writeFileSync(
    path.join(DATA_DIR, "demo-lesson-data.json"),
    JSON.stringify(demoLessonData, null, 2)
  );
  
  console.log("\nEditor code found:", demoLessonData.editorCode?.substring(0, 300) || "(none)");

  // Print API calls observed
  console.log("\nAPI calls observed:");
  apiCalls.forEach(c => console.log("  ", c));

  await browser.close();
  console.log("\n✅ Data saved to data/demo-* files");
}

discover().catch(console.error);
