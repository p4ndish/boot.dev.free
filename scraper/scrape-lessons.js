/**
 * scrape-lessons.js
 * Logs into boot.dev and scrapes actual lesson content:
 * - Instruction markdown
 * - Starter code
 * - Test code
 * - Solution code (optional)
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const CREDENTIALS = {
  email: "tesfayedagim5@gmail.com",
  password: "Pas$w0rd@boot.dev",
};

/**
 * Login to boot.dev and verify we're authenticated
 */
async function login(page) {
  console.log("🔐 Logging in...");
  
  // Go to login page
  await page.goto("https://www.boot.dev/login", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Try to fill login form
  const emailInputs = await page.$$("input[type='email'], input[name='email'], input[placeholder*='email'], input[placeholder*='Email']");
  const passwordInputs = await page.$$("input[type='password'], input[name='password']");
  
  if (emailInputs.length > 0 && passwordInputs.length > 0) {
    await emailInputs[0].fill(CREDENTIALS.email);
    await passwordInputs[0].fill(CREDENTIALS.password);
    await page.screenshot({ path: path.join(DATA_DIR, "login-form.png") });
    
    // Find submit button
    const submitBtn = await page.$("button[type='submit'], button:has-text('Sign In'), button:has-text('Login'), button:has-text('Continue')");
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
    } else {
      // Try pressing Enter
      await passwordInputs[0].press("Enter");
      await page.waitForTimeout(5000);
    }
  } else {
    // Maybe there's a different login flow
    // Try clicking "Sign In" first
    const signInBtn = await page.$("a:has-text('Sign In'), button:has-text('Sign In')");
    if (signInBtn) {
      await signInBtn.click();
      await page.waitForTimeout(3000);
      // Retry finding inputs
      const retryEmail = await page.$("input[type='email'], input[name='email']");
      const retryPass = await page.$("input[type='password']");
      if (retryEmail && retryPass) {
        await retryEmail.fill(CREDENTIALS.email);
        await retryPass.fill(CREDENTIALS.password);
        await page.screenshot({ path: path.join(DATA_DIR, "login-form-2.png") });
        const btn = await page.$("button[type='submit'], button:has-text('Sign In'), button:has-text('Login')");
        await (btn || retryPass).click();
        await page.waitForTimeout(5000);
      }
    }
  }

  await page.screenshot({ path: path.join(DATA_DIR, "after-login.png") });

  // Check if we're logged in
  const url = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText);
  const isLoggedIn = !bodyText.includes("Sign In") || bodyText.includes("Dashboard") || bodyText.includes("Welcome");
  
  console.log(`  Login ${isLoggedIn ? "✅ SUCCESS" : "⚠ UNSURE"} — URL: ${url}`);
  console.log(`  Page title: "${await page.title()}"`);
  
  return isLoggedIn;
}

/**
 * Discover lesson URL structure by navigating to a course
 */
async function discoverLessonStructure(page, courseSlug) {
  console.log(`\n🔍 Discovering lesson structure for: ${courseSlug}`);
  
  // Try different URL patterns
  const patterns = [
    `https://www.boot.dev/learn/${courseSlug}`,
    `https://www.boot.dev/courses/${courseSlug}/learn`,
    `https://www.boot.dev/courses/${courseSlug}`,  // Start course from here
  ];
  
  for (const pattern of patterns) {
    console.log(`  Trying: ${pattern}`);
    await page.goto(pattern, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(DATA_DIR, `discover-${courseSlug}.png`) });
    
    const url = page.url();
    const title = await page.title();
    console.log(`    → URL: ${url}`);
    console.log(`    → Title: ${title}`);
    
    // Check for lesson content indicators
    const hasEditor = await page.$(".cm-editor, .CodeMirror, [class*='codemirror']");
    const hasInstructions = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Run") && (text.includes("⌨") || text.includes("Ctrl") || text.includes("Enter"));
    });
    
    console.log(`    → Has editor: ${!!hasEditor}, Has run button: ${hasInstructions}`);
    
    if (hasEditor || hasInstructions) {
      console.log(`  ✅ Found lesson view at: ${pattern}`);
      return pattern;
    }
    
    // Look for "Start Course" or "Continue" buttons
    const startBtn = await page.$("a:has-text('Start'), button:has-text('Start'), a:has-text('Continue'), button:has-text('Continue')");
    if (startBtn) {
      console.log(`    → Found start/continue button, clicking...`);
      await startBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(DATA_DIR, `discover-afterclick-${courseSlug}.png`) });
      
      const newUrl = page.url();
      console.log(`    → New URL after click: ${newUrl}`);
      
      const hasEditor2 = await page.$(".cm-editor, .CodeMirror, [class*='codemirror']");
      if (hasEditor2) {
        return newUrl;
      }
    }
  }
  
  return null;
}

/**
 * Scrape a single lesson page
 */
async function scrapeLesson(page, lessonUrl) {
  await page.goto(lessonUrl, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  const lessonData = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    
    // Try to find instruction text (usually in a left panel)
    let instructions = bodyText;
    
    // Look for code in CodeMirror editor
    const cmContent = document.querySelector(".cm-content")?.textContent || "";
    const cmLines = document.querySelectorAll(".cm-line");
    let editorCode = "";
    cmLines.forEach(line => {
      editorCode += line.textContent + "\n";
    });
    if (!editorCode.trim()) editorCode = cmContent;

    // Find run/debug controls
    const hasRunButton = bodyText.includes("Run") && bodyText.includes("Ctrl");
    const hasSubmitButton = bodyText.includes("Submit");
    
    // Lesson navigation
    const nextBtn = document.querySelector("a[href*='next'], button:has-text('Next'), [class*='next']");
    const prevBtn = document.querySelector("a[href*='prev'], button:has-text('Prev'), [class*='prev']");
    
    // Lesson title
    const lessonTitle = document.querySelector("h1, h2, [class*='lesson-title']")?.textContent?.trim() || "";
    
    // Check if tests are visible
    const testOutput = document.querySelector("[class*='test'], [class*='output'], [class*='console']")?.textContent || "";

    // Difficulty/status
    const completionText = bodyText.match(/Complete|Incomplete|Passed|Failed/)?.[0] || "";

    return {
      lessonTitle,
      instructions: instructions.substring(0, 3000),
      editorCode: editorCode.trim(),
      testOutput,
      hasRunButton,
      hasSubmitButton,
      completionText,
    };
  });

  // Screenshot for debugging
  const lessonId = lessonUrl.split("/").pop();
  await page.screenshot({ 
    path: path.join(DATA_DIR, `lesson-${lessonId}.png`),
    fullPage: false 
  });

  return lessonData;
}

/**
 * Main: Login → discover → scrape first few lessons
 */
async function main() {
  console.log("🚀 Lesson scraper — starting...\n");

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

  // Step 1: Login
  await login(page);

  // Step 2: Discover lesson URL structure
  const lessonEntry = await discoverLessonStructure(page, "learn-code-python");
  
  if (!lessonEntry) {
    console.log("\n❌ Could not find lesson entry point.");
    console.log("Try manual investigation — check screenshots in data/");
    await browser.close();
    return;
  }

  // Step 3: Try to scrape a lesson
  console.log(`\n📝 Scraping first lesson...`);
  const lessonData = await scrapeLesson(page, page.url());
  
  console.log(`\n${"=".repeat(50)}`);
  console.log("LESSON DATA:");
  console.log(`${"=".repeat(50)}`);
  console.log(`Title: ${lessonData.lessonTitle}`);
  console.log(`Has editor code: ${lessonData.editorCode.length > 0} (${lessonData.editorCode.length} chars)`);
  console.log(`Has run button: ${lessonData.hasRunButton}`);
  console.log(`Has submit button: ${lessonData.hasSubmitButton}`);
  console.log(`\nInstructions (first 500 chars):`);
  console.log(lessonData.instructions?.substring(0, 500));
  console.log(`\nEditor Code:`);
  console.log(lessonData.editorCode?.substring(0, 500) || "(empty)");

  // Save
  fs.writeFileSync(
    path.join(DATA_DIR, "first-lesson.json"),
    JSON.stringify({ url: page.url(), ...lessonData }, null, 2)
  );

  await browser.close();
  console.log(`\n✅ Done. Screenshots and data saved to data/`);
}

main().catch(console.error);
