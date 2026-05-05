/**
 * parse-curriculum.js
 * Parses the bootdotdev/curriculum repo path files into structured JSON.
 * Extracts: paths, course names, slugs, languages, and link URLs.
 */

const fs = require("fs");
const path = require("path");

const CURRICULUM_DIR = path.join(__dirname, "..", "curriculum", "paths");
const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Parse a path markdown file (backend.md, devops.md, etc.)
 * Extracts path name, tech variants, and full course list.
 */
function parsePathFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const filename = path.basename(filePath, ".md");
  const lines = content.split("\n");

  const result = {
    path_slug: filename,
    path_name: "",
    variants: [],
  };

  // Extract path name from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) result.path_name = titleMatch[1].trim();

  // Find variant sections (## headings with links)
  let currentVariant = null;

  for (const line of lines) {
    // Match variant headers like "## [Python & Go](https://...)" or "## [Python & TypeScript](https://...)"
    const variantMatch = line.match(
      /^##\s+\[(.+?)\]\(https:\/\/www\.boot\.dev\/paths\/([^)]+)\)/
    );
    if (variantMatch) {
      if (currentVariant) {
        result.variants.push(currentVariant);
      }
      currentVariant = {
        variant_name: variantMatch[1].trim(),
        variant_url: `https://www.boot.dev/paths/${variantMatch[2]}`,
        tech: variantMatch[1].toLowerCase(),
        courses: [],
      };
      continue;
    }

    // Skip table headers and separators
    if (
      !currentVariant ||
      line.includes("| ---") ||
      line.trim() === "" ||
      line.startsWith("#")
    )
      continue;

    // Parse table rows: | Course Name | Links/Description |
    const rowMatch = line.match(
      /^\|\s*(.+?)\s*\|\s*(?:\[(.+?)\]\(([^)]+)\)|(.+?))\s*\|/
    );
    if (rowMatch) {
      const courseName = rowMatch[1].trim();
      const linkText = rowMatch[2] || rowMatch[4] || "";
      const linkUrl = rowMatch[3] || "";

      // Skip header rows
      if (courseName === "Course Name" || courseName === "---") continue;

      // Extract slug from URL
      let slug = "";
      if (linkUrl) {
        const slugMatch = linkUrl.match(/\/courses\/([^\/\s]+)/);
        if (slugMatch) slug = slugMatch[1];
      }

      // Extract language from link text
      let language = linkText.trim();
      if (language === "Your choice") language = "any";

      currentVariant.courses.push({
        name: courseName,
        slug: slug,
        language: language,
        url: linkUrl || null,
        step: currentVariant.courses.length + 1,
      });
    }
  }

  // Push last variant
  if (currentVariant) result.variants.push(currentVariant);

  return result;
}

/**
 * Parse all path files and create a combined course list with deduplication.
 */
function parseAllPaths() {
  const files = fs.readdirSync(CURRICULUM_DIR).filter((f) => f.endsWith(".md"));

  const allPaths = [];
  const courseMap = new Map();

  for (const file of files) {
    const parsedPath = parsePathFile(path.join(CURRICULUM_DIR, file));
    allPaths.push(parsedPath);

    // Extract all unique courses
    for (const variant of parsedPath.variants) {
      for (const course of variant.courses) {
        if (course.slug && !courseMap.has(course.slug)) {
          courseMap.set(course.slug, {
            slug: course.slug,
            name: course.name,
            languages: [course.language],
            url: course.url,
            paths: [
              {
                path_name: parsedPath.path_name,
                variant: variant.variant_name,
                step: course.step,
              },
            ],
          });
        } else if (course.slug) {
          const existing = courseMap.get(course.slug);
          if (!existing.languages.includes(course.language)) {
            existing.languages.push(course.language);
          }
          existing.paths.push({
            path_name: parsedPath.path_name,
            variant: variant.variant_name,
            step: course.step,
          });
        }
      }
    }
  }

  const courses = Array.from(courseMap.values());

  return { paths: allPaths, courses };
}

// Parse all and write output
const data = parseAllPaths();

// Save paths
fs.writeFileSync(
  path.join(DATA_DIR, "paths.json"),
  JSON.stringify(data.paths, null, 2)
);

// Save unique courses
fs.writeFileSync(
  path.join(DATA_DIR, "courses.json"),
  JSON.stringify(data.courses, null, 2)
);

// Save course slugs list (for scraper input)
const courseSlugs = data.courses.map((c) => c.slug).filter(Boolean);
fs.writeFileSync(
  path.join(DATA_DIR, "course-slugs.json"),
  JSON.stringify(courseSlugs, null, 2)
);

console.log(`✅ Parsed ${data.paths.length} paths`);
console.log(`✅ Found ${data.courses.length} unique courses`);
console.log(`✅ Found ${courseSlugs.length} course slugs`);
console.log(`✅ Data written to data/ directory`);

// Print summary
for (const pathData of data.paths) {
  console.log(`\n📚 ${pathData.path_name}`);
  for (const variant of pathData.variants) {
    console.log(
      `   ${variant.variant_name}: ${variant.courses.length} courses`
    );
  }
}
