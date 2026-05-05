-- backend/migrations/001_schema.sql
-- Database schema for boot.dev clone

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Learning paths
CREATE TABLE IF NOT EXISTS paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    technologies TEXT[],
    estimated_months INT,
    course_uuids UUID[],
    recommended_course_uuids UUID[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    hours INT,
    lesson_count INT,
    course_type TEXT DEFAULT 'course',
    status TEXT DEFAULT 'live',
    path_ids UUID[],
    prerequisites UUID[],
    thumbnail_url TEXT,
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters within a course
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, order_index)
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    lesson_type TEXT NOT NULL,         -- type_code, type_choice, type_cli, etc.
    readme TEXT,                        -- Markdown instruction content
    language TEXT,                      -- py, go, js, ts, sql, etc.
    topics TEXT[],
    difficulty INT DEFAULT 1,
    is_free BOOLEAN DEFAULT false,
    starter_files JSONB,               -- [{name, content, isHidden, isReadonly}]
    solution_files JSONB,              -- [{name, content}]
    expected_output TEXT,
    question JSONB,                     -- For type_choice: {question, answers, correctAnswer}
    cli_data JSONB,                     -- For type_cli
    order_index INT NOT NULL,
    last_modified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(chapter_id, order_index)
);

-- Users (optional)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    oauth_provider TEXT,
    oauth_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson progress tracking
CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    attempts INT DEFAULT 0,
    last_code TEXT,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, lesson_id)
);

-- Challenge attempts
CREATE TABLE IF NOT EXISTS challenge_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_lesson_id UUID REFERENCES lessons(id),
    passed BOOLEAN,
    submitted_code TEXT,
    attempted_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON lessons(lesson_type);
CREATE INDEX IF NOT EXISTS idx_lessons_language ON lessons(language);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
