#!/usr/bin/env node
/**
 * scripts/seed-db.js
 * Seeds PostgreSQL with all scraped course and lesson data.
 * Usage: node scripts/seed-db.js
 * Config via environment variables or .env:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/dbname
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATA_DIR = path.join(__dirname, "..", "data");

// Config — respects existing containers (different port/db name)
const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433"), // 5433 to avoid existing postgres
  database: process.env.DB_NAME || "bootdev_clone",
  user: process.env.DB_USER || "bootdev",
  password: process.env.DB_PASS || "bootdev",
};

const pool = new Pool(config);

async function seed() {
  console.log(`🔌 Connecting to PostgreSQL at ${config.host}:${config.port}/${config.database}...`);
  const client = await pool.connect();

  try {
    // Create schema
    console.log("📐 Creating schema...");
    const schema = fs.readFileSync(
      path.join(__dirname, "..", "backend", "migrations", "001_schema.sql"),
      "utf8"
    );
    await client.query(schema);
    console.log("  ✅ Schema created");

    // Load data
    const paths = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "paths-api.json"), "utf8"));
    const coursesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "courses-api.json"), "utf8"));
    const allLessons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "lessons-api.json"), "utf8"));

    // Seed paths
    console.log(`\n📊 Seeding ${paths.length} paths...`);
    for (const p of paths) {
      await client.query(
        `INSERT INTO paths (slug, title, short_description, description, technologies, estimated_months, course_uuids)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET title=$2`,
        [p.slug, p.title, p.description, p.description, p.technologies, p.estimatedMonths, p.courseUUIDs]
      );
    }
    console.log(`  ✅ ${paths.length} paths seeded`);

    // Seed courses
    const courses = Object.values(coursesData);
    console.log(`\n📚 Seeding ${courses.length} courses...`);
    let courseCount = 0;
    for (const c of courses) {
      if (!c.slug) continue;
      await client.query(
        `INSERT INTO courses (slug, title, short_description, description, hours, lesson_count, course_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET title=$2`,
        [c.slug, c.title, c.shortDescription, c.description, c.hours, c.lessonCount, c.type, c.status || "live"]
      );
      courseCount++;
    }
    console.log(`  ✅ ${courseCount} courses seeded`);

    // Seed chapters and lessons
    console.log(`\n📝 Seeding chapters and lessons...`);
    let chapterCount = 0;
    let lessonCount = 0;

    for (const c of courses) {
      if (!c.slug || !c.chapters) continue;

      // Get course UUID
      const courseResult = await client.query(
        "SELECT id FROM courses WHERE slug = $1", [c.slug]
      );
      if (courseResult.rows.length === 0) continue;
      const courseId = courseResult.rows[0].id;

      for (const [idx, ch] of c.chapters.entries()) {
        await client.query(
          `INSERT INTO chapters (course_id, slug, title, description, order_index)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (course_id, order_index) DO UPDATE SET title=$3`,
          [courseId, ch.slug || `ch-${idx}`, ch.title, ch.description, idx]
        );
        chapterCount++;

        // Get chapter UUID
        const chResult = await client.query(
          "SELECT id FROM chapters WHERE course_id = $1 AND order_index = $2",
          [courseId, idx]
        );
        const chapterId = chResult.rows[0]?.id;
        if (!chapterId) continue;

        // Seed lessons
        for (const [lIdx, l] of (ch.lessons || []).entries()) {
          const lesson = allLessons[l.uuid];
          if (!lesson) continue;

          await client.query(
            `INSERT INTO lessons (chapter_id, course_id, slug, title, lesson_type, 
             readme, language, topics, difficulty, is_free, starter_files, question, cli_data, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (chapter_id, order_index) DO UPDATE SET title=$4`,
            [
              chapterId, courseId,
              lesson.slug || `l-${lIdx}`,
              lesson.title || l.title,
              lesson.type || l.type,
              lesson.readme || "",
              lesson.language || "",
              lesson.topics || [],
              lesson.difficulty || l.difficulty || 1,
              lesson.isFree || false,
              JSON.stringify(lesson.starterFiles || []),
              lesson.question ? JSON.stringify(lesson.question) : null,
              lesson.cliData ? JSON.stringify(lesson.cliData) : null,
              lIdx,
            ]
          );
          lessonCount++;
        }
      }
    }

    console.log(`  ✅ ${chapterCount} chapters seeded`);
    console.log(`  ✅ ${lessonCount} lessons seeded`);

    console.log(`\n${"=".repeat(50)}`);
    console.log("✅ DATABASE SEED COMPLETE");
    console.log(`${"=".repeat(50)}`);
    console.log(`  Paths: ${paths.length}`);
    console.log(`  Courses: ${courseCount}`);
    console.log(`  Chapters: ${chapterCount}`);
    console.log(`  Lessons: ${lessonCount}`);

  } catch (error) {
    console.error("❌ Seed error:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
