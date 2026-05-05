# Boot.dev Clone — Complete Implementation Plan

## Project Vision

A **free, subscription-free clone** of boot.dev that preserves the core learning experience
(interactive code lessons, tests, terminals, projects) while removing all gamification
(XP, streaks, quests, leaderboards, lore, Boots AI assistant).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack Decisions](#2-tech-stack-decisions)
3. [Database Schema](#3-database-schema)
4. [Phase 0: Content Scraping & Ingestion (Week 1-2)](#4-phase-0-content-scraping--ingestion)
5. [Phase 1: Core Platform MVP (Weeks 3-6)](#5-phase-1-core-platform-mvp-weeks-3-6)
6. [Phase 2: Code Execution Engine (Weeks 7-9)](#6-phase-2-code-execution-engine-weeks-7-9)
7. [Phase 3: Terminal/PTY Execution (Weeks 10-12)](#7-phase-3-terminalpty-execution-weeks-10-12)
8. [Phase 4: Training Grounds & Playgrounds (Weeks 13-14)](#8-phase-4-training-grounds--playgrounds-weeks-13-14)
9. [Phase 5: Polish & Launch (Weeks 15-16)](#9-phase-5-polish--launch-weeks-15-16)
10. [Infrastructure & DevOps Plan](#10-infrastructure--devops-plan)
11. [Risk Register](#11-risk-register)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              React + Next.js (App Router)               ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ││
│  │  │ Lesson   │ │ Course   │ │ Training │ │ Playground │ ││
│  │  │ Viewer   │ │ Catalog  │ │ Grounds  │ │  Runner    │ ││
│  │  └────┬─────┘ └──────────┘ └──────────┘ └─────┬─────┘ ││
│  │       │                                        │       ││
│  │  ┌────▼────────────────────────────────────────▼─────┐ ││
│  │  │            Execution Layer (Dual Model)            │ ││
│  │  │  ┌─────────────────┐  ┌──────────────────────┐    │ ││
│  │  │  │  Web Workers     │  │  xterm.js + WSS      │    │ ││
│  │  │  │  (Pyodide, WASM) │  │  (PTY Terminal)      │    │ ││
│  │  │  └────────┬────────┘  └──────────┬───────────┘    │ ││
│  │  └───────────┼──────────────────────┼────────────────┘ ││
│  └──────────────┼──────────────────────┼──────────────────┘│
└─────────────────┼──────────────────────┼───────────────────┘
                  │                      │
     ┌────────────▼──────────┐  ┌───────▼──────────────┐
     │  CDN (Pyodide, WASM)  │  │  WebSocket PTY Relay │
     └───────────────────────┘  └───────┬──────────────┘
                                        │
┌───────────────────────────────────────┼──────────────────────┐
│                      BACKEND (Go / Python)                    │
│  ┌────────────────────────────────────▼───────────────────┐  │
│  │               API Server (REST + WSS)                   │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │  │
│  │  │  Auth   │ │ Courses  │ │Progress  │ │ Execution │ │  │
│  │  │ Service │ │  Service │ │ Service  │ │  Service  │ │  │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘ │  │
│  └───────┼───────────┼────────────┼───────────────┼───────┘  │
│          │           │            │               │          │
│  ┌───────▼───────────▼────────────▼───────────────▼───────┐  │
│  │                   PostgreSQL                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │             Container Orchestrator (Docker)             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │  │
│  │  │  Linux Shell │ │  Docker-in-  │ │ K8s/MiniKube │   │  │
│  │  │  Container   │ │  Docker Pod  │ │  Container   │   │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **Browser-first execution**: Python, Go, JS, TS, C run in the browser via Web Workers (minimizes server load, costs, and security surface)
- **Server PTY only for systems**: Docker, K8s, Bash, Git need real shells → isolated containers
- **Content is static**: All lessons/courses are stored in DB, served via REST API, rendered client-side
- **No paywall**: No Stripe integration needed. Auth optional for progress tracking.

---

## 2. Tech Stack Decisions

### Frontend
| Component | Choice | Why |
|-----------|--------|-----|
| Framework | **Next.js 14+ (App Router)** | SSR for course pages (SEO), React ecosystem, file-based routing |
| Language | **TypeScript** | Type safety across the codebase |
| Editor | **CodeMirror 6** | Same as boot.dev, extensible, supports all languages, vim mode |
| Terminal | **xterm.js** | Same as boot.dev, battle-tested PTY rendering |
| Styling | **Tailwind CSS** | Same as boot.dev, rapid prototyping |
| State | **Zustand** or **Pinia**-like store | Lightweight, no boilerplate |
| Auth | **NextAuth.js** or **Clerk** | Easy GitHub/Google OAuth |

### Backend
| Component | Choice | Why |
|-----------|--------|-----|
| Language | **Go** (primary) or **Python/FastAPI** | Go = excellent WebSocket/PTY support + compilation to WASM. Python/FastAPI = simpler if team is Python-first |
| HTTP Router | **chi** (Go) or **FastAPI** (Python) | Lightweight, fast |
| ORM | **sqlc** (Go) or **SQLAlchemy** (Python) | Type-safe SQL, no runtime reflection |
| Database | **PostgreSQL** | Same as boot.dev, industry standard |
| PTY Library | **creack/pty** (Go) or **node-pty** (Node) | Battle-tested PTY spawning |
| Container SDK | **docker/docker** Go client or **dockerode** (Node) | Programmatic container lifecycle |
| WASM Compile | `go build GOOS=js GOARCH=wasm` on-demand | Standard Go toolchain |

### Infrastructure
| Component | Choice | Why |
|-----------|--------|-----|
| Hosting | **VPS** (Hetzner/DigitalOcean) or **AWS EC2** | ~$40-100/month to start |
| Container Runtime | **Docker** | Ubiquitous, simple API |
| Reverse Proxy | **Caddy** or **Nginx** | Auto-HTTPS with Caddy |
| CDN | **Cloudflare** (free tier) | Cache static assets, DDoS protection |
| CI/CD | **GitHub Actions** | Free for public repos |
| Monitoring | **Grafana + Prometheus** (optional at start) | Observability |

---

## 3. Database Schema

```sql
-- ======================
-- CONTENT TABLES
-- ======================

-- Learning paths (Back-end, DevOps, etc.)
CREATE TABLE paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,           -- e.g., 'backend', 'devops'
    title TEXT NOT NULL,
    description TEXT,
    tech_variant TEXT,                   -- 'python-golang' or 'python-typescript'
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID REFERENCES paths(id),
    slug TEXT UNIQUE NOT NULL,           -- e.g., 'learn-code-python'
    title TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    hours INT,                           -- Estimated completion hours
    lesson_count INT,
    language TEXT,                       -- 'python', 'go', 'sql', etc.
    course_type TEXT,                    -- 'course', 'guided_project', 'portfolio_project'
    difficulty TEXT,                     -- 'beginner', 'intermediate', 'advanced'
    order_index INT NOT NULL,
    prerequisites TEXT[],                -- Array of course slugs
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters within a course
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual lessons within a chapter
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instruction_markdown TEXT NOT NULL,  -- The lesson content (Markdown)
    starter_code TEXT,                   -- Pre-filled code template
    solution_code TEXT,                  -- Correct solution (for reference)
    test_code TEXT,                      -- Test runner code
    language TEXT,                       -- Language for syntax highlighting
    lesson_type TEXT DEFAULT 'code',     -- 'code', 'terminal', 'quiz', 'reading'
    terminal_config JSONB,              -- For terminal lessons: { image, command, env }
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training ground challenges
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description_markdown TEXT NOT NULL,
    difficulty TEXT,                     -- 'easy', 'medium', 'hard'
    language TEXT,
    topic TEXT,                          -- 'recursion', 'binary-search', 'sql-joins'
    challenge_type TEXT,                 -- 'write_code', 'fix_bug'
    starter_code TEXT,
    solution_code TEXT,
    test_code TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ======================
-- USER & PROGRESS TABLES
-- ======================

-- Users (optional — platform works without login too)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    oauth_provider TEXT,
    oauth_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson completion tracking
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    attempts INT DEFAULT 0,
    last_code TEXT,                      -- Last submitted code
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, lesson_id)
);

-- Challenge attempts
CREATE TABLE challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    passed BOOLEAN,
    submitted_code TEXT,
    attempted_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Phase 0: Content Scraping & Ingestion (Week 1-2)

### Strategy

boot.dev's curriculum is **open-source** on [GitHub](https://github.com/bootdotdev/curriculum).
The path definitions (backend.md, devops.md) list every course with links.
Each course page (`/courses/{slug}`) lists all chapters.

**Three-tier scraping approach:**

| Tier | Source | What We Get | Method |
|------|--------|-------------|--------|
| **Tier 1** | `github.com/bootdotdev/curriculum` | Complete path definitions, course lists | Git clone + parse Markdown tables |
| **Tier 2** | `/courses/{slug}` pages | Chapter names, descriptions, metadata | HTTP fetch + HTML parse (+ headless browser for JS-rendered content) |
| **Tier 3** | Actual lesson pages | Instruction text, starter code, tests, solutions | Requires auth + careful rate-limited scraping (ethical concern — might need manual curation) |

### Tier 3 Ethical Consideration

boot.dev's lesson content is **proprietary** (not open source, only paths are open).
**Two approaches:**
1. **Scrape existing content** — legal gray area, requires auth, rate-limiting, and respect for ToS
2. **Author original content** — follow boot.dev's chapter structure but write original lessons
   (boot.dev explicitly invites content authors via `/create-a-course`)

**Recommended:** Use Tier 1+2 for structure, then **author original lessons** following the same
chapter outline. This avoids legal issues and creates genuinely useful content.

### Scraper Implementation

```python
# scraper/course_catalog.py
import httpx
from bs4 import BeautifulSoup
import json
from pathlib import Path

async def fetch_course_list():
    """Fetch all courses from boot.dev/courses page"""
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://www.boot.dev/courses")
        soup = BeautifulSoup(resp.text, "html.parser")
        
        courses = []
        for card in soup.select("[data-course-card]"):
            courses.append({
                "slug": card["data-slug"],
                "title": card.select_one(".course-title").text,
                "lessons": int(card["data-lessons"]),
                "hours": int(card["data-hours"]),
                "language": card["data-language"],
                "type": card["data-type"],
            })
        return courses

async def fetch_curriculum_from_github():
    """Clone and parse the open curriculum roadmap"""
    # git clone https://github.com/bootdotdev/curriculum
    # Parse paths/*.md for course lists
    pass
```

```python
# scraper/lesson_scraper.py
# Playwright-based scraper for JS-rendered course pages

from playwright.async_api import async_playwright

async def scrape_course_structure(slug: str):
    """Extract chapter/lesson structure from a course page"""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(f"https://www.boot.dev/courses/{slug}")
        
        chapters = []
        chapter_elements = await page.query_selector_all("[data-chapter]")
        for el in chapter_elements:
            title = await el.query_selector(".chapter-title")
            lessons = await el.query_selector_all(".lesson-item")
            chapters.append({
                "title": await title.inner_text(),
                "lessons": [await l.inner_text() for l in lessons]
            })
        
        await browser.close()
        return chapters
```

### Deliverables (Phase 0)

- [ ] Complete course catalog JSON (all 50+ courses with metadata)
- [ ] Complete path structure (all steps in order with prerequisites)
- [ ] Chapter structure for every course (chapter titles + descriptions)
- [ ] Lesson titles for every course
- [ ] **Decision: Scrape vs. Author content** for Tier 3
- [ ] Database seeded with all Phase 0 data

---

## 5. Phase 1: Core Platform MVP (Weeks 3-6)

### Goal
Build the basic site that can:
- Display course catalog
- Show individual course details with chapter list
- Render a learning path roadmap
- Allow users to browse lessons (read-only content first)

### Sprint 1 (Week 3): Project Setup + DB

```bash
# Frontend setup
npx create-next-app@latest boot-dev-clone --typescript --tailwind
cd boot-dev-clone
npm install @codemirror/view @codemirror/state @codemirror/lang-python
npm install @codemirror/lang-javascript @codemirror/lang-go @codemirror/lang-sql
npm install @codemirror/lang-cpp @codemirror/theme-one-dark
npm install react-markdown remark-gfm
npm install zustand xterm
npm install next-auth @auth/prisma-adapter

# Backend setup (Go)
mkdir backend && cd backend
go mod init github.com/yourusername/boot-dev-clone-backend
go get github.com/go-chi/chi/v5
go get github.com/jackc/pgx/v5
go get github.com/google/uuid
go get github.com/golang-jwt/jwt/v5
```

**Tasks:**
- [ ] Set up Next.js project with App Router
- [ ] Set up Go API server
- [ ] PostgreSQL database + Docker Compose for local dev
- [ ] Run database migrations (schema above)
- [ ] Seed database with scraped course catalog data
- [ ] Set up CI/CD pipeline (GitHub Actions)

### Sprint 2 (Week 4): Course Catalog Pages

**Tasks:**
- [ ] `/courses` — Course catalog grid (filterable, searchable)
- [ ] `/courses/[slug]` — Course detail with chapter list
- [ ] `/paths/[slug]` — Learning path roadmap (linear steps view)
- [ ] API endpoints: `GET /api/courses`, `GET /api/courses/:slug`, `GET /api/paths/:slug`
- [ ] Basic layout: Navbar, footer, responsive design
- [ ] Dark theme (following boot.dev's aesthetic)

**Component Tree:**
```
app/
├── layout.tsx              (Root layout: Navbar, Footer)
├── page.tsx                (Homepage with path cards)
├── courses/
│   ├── page.tsx            (Course catalog grid)
│   └── [slug]/
│       └── page.tsx        (Course detail)
├── paths/
│   └── [slug]/
│       └── page.tsx        (Path roadmap)
├── learn/
│   └── [courseSlug]/
│       └── [lessonId]/
│           └── page.tsx    (Lesson viewer - read only for now)
├── playground/
│   └── [lang]/
│       └── page.tsx        (Playground - Phase 4)
└── training/
    └── page.tsx            (Training grounds - Phase 4)
```

### Sprint 3 (Week 5): Lesson Viewer (Read-Only)

**Tasks:**
- [ ] `/learn/[courseSlug]/[lessonId]` — Full lesson page
- [ ] Split-pane layout: Instructions (left) | Code Editor (right)
- [ ] Markdown rendering with syntax highlighting
- [ ] CodeMirror 6 integration (syntax highlighting, but no execution yet)
- [ ] Navigation: Previous/Next lesson buttons
- [ ] Chapter sidebar with lesson list + progress indicators

### Sprint 4 (Week 6): Auth + Progress

**Tasks:**
- [ ] User registration/login (GitHub OAuth, email)
- [ ] Progress tracking (mark lessons as completed)
- [ ] Resume from last lesson functionality
- [ ] Simple user dashboard (`/dashboard`)

---

## 6. Phase 2: Code Execution Engine (Weeks 7-9)

### The Most Critical Phase

This is what makes it an interactive learning platform, not just a tutorial site.

### Execution Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        Browser                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 ExecutionService                          │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐ │  │
│  │  │ Language Workers  │  │    PTY Terminal Workers      │ │  │
│  │  │ ┌──────┐┌──────┐ │  │  (Phase 3)                   │ │  │
│  │  │ │Python││  Go  │ │  │                              │ │  │
│  │  │ │Worker││Worker│ │  │                              │ │  │
│  │  │ └──┬───┘└──┬───┘ │  └──────────────────────────────┘ │  │
│  │  │    │       │     │                                    │  │
│  │  │ ┌──▼───┐┌──▼───┐ │                                    │  │
│  │  │ │  JS  ││  C   │ │                                    │  │
│  │  │ │Worker││Worker│ │                                    │  │
│  │  │ └──────┘└──────┘ │                                    │  │
│  │  └──────────────────┘                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Sprint 5 (Week 7): Python Execution (Pyodide)

**Target:** Students can write Python, hit Run, and see output.

```typescript
// frontend/workers/python.worker.ts
importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js");

let pyodide: any = null;

async function initPyodide() {
    pyodide = await (self as any).loadPyodide();
    pyodide.setStdout({
        batched: (text: string) => {
            self.postMessage({ type: "stdout", text });
        }
    });
    pyodide.setStderr({
        batched: (text: string) => {
            self.postMessage({ type: "stderr", text });
        }
    });
    self.postMessage({ type: "ready" });
}

async function executeCode(code: string) {
    if (!pyodide) await initPyodide();
    
    try {
        // Write code to virtual filesystem
        pyodide.FS.writeFile("/main.py", code);
        
        // Run with namespace isolation
        const result = await pyodide.runPythonAsync(code);
        
        // Auto-print last expression (REPL-like behavior)
        if (result !== undefined) {
            self.postMessage({ type: "stdout", text: String(result) + "\n" });
        }
    } catch (error: any) {
        self.postMessage({ type: "error", text: error.message });
    } finally {
        self.postMessage({ type: "done" });
    }
}

self.onmessage = (event) => {
    const { type, code } = event.data;
    if (type === "init") initPyodide();
    if (type === "run") executeCode(code);
};
```

```typescript
// frontend/hooks/useCodeExecution.ts
import { useState, useCallback, useRef } from "react";

interface ExecutionOutput {
    type: "stdout" | "stderr" | "error" | "done";
    text?: string;
    exitCode?: number;
}

export function useCodeExecution() {
    const [output, setOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const workerRef = useRef<Worker | null>(null);

    const initWorker = useCallback(async (language: string) => {
        // Map language to worker file
        const workerMap: Record<string, string> = {
            python: "/workers/python.worker.js",
            javascript: "/workers/javascript.worker.js",
            typescript: "/workers/typescript.worker.js",
            go: "/workers/go.worker.js",
            c: "/workers/c.worker.js",
        };
        
        const workerUrl = workerMap[language];
        workerRef.current = new Worker(workerUrl);
        
        return new Promise<void>((resolve) => {
            workerRef.current!.onmessage = (e) => {
                if (e.data.type === "ready") resolve();
            };
            workerRef.current!.postMessage({ type: "init" });
        });
    }, []);

    const runCode = useCallback(async (code: string, language: string) => {
        if (!workerRef.current) {
            await initWorker(language);
        }
        
        setIsRunning(true);
        setOutput("");
        
        return new Promise<string>((resolve) => {
            let fullOutput = "";
            
            workerRef.current!.onmessage = (e) => {
                const msg: ExecutionOutput = e.data;
                if (msg.type === "stdout" || msg.type === "stderr") {
                    fullOutput += msg.text;
                    setOutput(fullOutput);
                }
                if (msg.type === "error") {
                    fullOutput += `Error: ${msg.text}\n`;
                    setOutput(fullOutput);
                }
                if (msg.type === "done") {
                    setIsRunning(false);
                    resolve(fullOutput);
                }
            };
            
            workerRef.current!.postMessage({ type: "run", code });
        });
    }, [initWorker]);

    return { output, isRunning, runCode };
}
```

```tsx
// frontend/components/CodeRunner.tsx
"use client";
import { useCodeExecution } from "@/hooks/useCodeExecution";
import { EditorView } from "@codemirror/view";

export function CodeRunner({ 
    initialCode, 
    language, 
    testCode 
}: { 
    initialCode: string; 
    language: string;
    testCode?: string;
}) {
    const { output, isRunning, runCode } = useCodeExecution();
    const [code, setCode] = useState(initialCode);
    const [testResult, setTestResult] = useState<"pass" | "fail" | null>(null);

    const handleRun = async () => {
        const codeToRun = testCode 
            ? `${code}\n\n${testCode}`
            : code;
        await runCode(codeToRun, language);
    };

    return (
        <div className="flex flex-col h-full">
            {/* CodeMirror Editor */}
            <CodeMirrorEditor 
                value={code} 
                onChange={setCode}
                language={language}
                className="flex-1"
            />
            
            {/* Run Button + Output */}
            <div className="border-t border-gray-700 p-4">
                <button 
                    onClick={handleRun}
                    disabled={isRunning}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 
                               text-white rounded-lg font-semibold
                               disabled:opacity-50 transition-colors"
                >
                    {isRunning ? "Running..." : "Run ▶"}
                </button>
                
                <pre className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg 
                                font-mono text-sm overflow-auto max-h-64">
                    {output || "Click Run to see output..."}
                </pre>
                
                {testResult && (
                    <div className={`mt-2 text-lg font-bold ${
                        testResult === "pass" ? "text-green-400" : "text-red-400"
                    }`}>
                        {testResult === "pass" ? "✓ Tests Passed!" : "✗ Tests Failed"}
                    </div>
                )}
            </div>
        </div>
    );
}
```

### Sprint 6 (Week 8): JavaScript, TypeScript, Go, C Execution

**Tasks:**
- [ ] JavaScript Web Worker (direct eval in isolated scope)
- [ ] TypeScript Worker (TS → JS compilation via TypeScript WASM in worker)
- [ ] Go WASM execution (code → backend compiles to WASM → browser runs)
- [ ] C WASM execution (code → Emscripten compilation → browser runs)
- [ ] Unified worker manager (one interface for all languages)

**Go Compilation Endpoint:**
```go
// backend/handlers/compile.go
func (h *CompileHandler) CompileGo(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Source string `json:"source"`
    }
    json.NewDecoder(r.Body).Decode(&req)
    
    // Create temp directory
    dir, _ := os.MkdirTemp("", "go-wasm-*")
    defer os.RemoveAll(dir)
    
    // Write source
    os.WriteFile(filepath.Join(dir, "main.go"), []byte(req.Source), 0644)
    os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module main"), 0644)
    
    // Compile to WASM
    cmd := exec.Command("go", "build", "-o", "main.wasm", "main.go")
    cmd.Dir = dir
    cmd.Env = append(os.Environ(), "GOOS=js", "GOARCH=wasm")
    
    if out, err := cmd.CombinedOutput(); err != nil {
        http.Error(w, string(out), 400)
        return
    }
    
    wasmBytes, _ := os.ReadFile(filepath.Join(dir, "main.wasm"))
    w.Header().Set("Content-Type", "application/wasm")
    w.Write(wasmBytes)
}
```

### Sprint 7 (Week 9): Test Runner Framework

**Tasks:**
- [ ] Generic test runner that appends test code after user code
- [ ] Test assertion library (simple `assert_equal`, `assert_contains` helpers)
- [ ] Visual pass/fail feedback with diff display
- [ ] "Submit" mode: run tests, unlock next lesson on pass
- [ ] Persist last submitted code

**Test Format (stored in `lessons.test_code`):**
```python
def test_solution():
    # Student's code is prepended automatically
    result = add(2, 3)
    assert result == 5, f"Expected 5, got {result}"
    
    result = add(-1, 1)
    assert result == 0, f"Expected 0, got {result}"
    
    print("All tests passed!")
```

---

## 7. Phase 3: Terminal/PTY Execution (Weeks 10-12)

### For: Linux, Docker, Kubernetes, Git, CI/CD courses

### Sprint 8 (Week 10): PTY Infrastructure

**Architecture:**
```
Browser (xterm.js) ←→ WebSocket ←→ Go Server ←→ Docker Container
```

**WebSocket PTY Handler (Go):**
```go
// backend/handlers/pty.go
func (h *PTYHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    defer conn.Close()
    
    // 1. Create isolated container for this session
    ctx := context.Background()
    container, _ := h.docker.ContainerCreate(ctx, &container.Config{
        Image: r.URL.Query().Get("image"), // e.g., "ubuntu:22.04"
        Tty:   true,
        Cmd:   []string{"/bin/bash"},
    }, nil, nil, nil, "")
    
    h.docker.ContainerStart(ctx, container.ID, container.StartOptions{})
    defer func() {
        // Clean up after session
        timeout := 0
        h.docker.ContainerStop(ctx, container.ID, container.StopOptions{Timeout: &timeout})
        h.docker.ContainerRemove(ctx, container.ID, container.RemoveOptions{Force: true})
    }()
    
    // 2. Create exec with PTY
    exec, _ := h.docker.ContainerExecCreate(ctx, container.ID, types.ExecConfig{
        AttachStdin:  true,
        AttachStdout: true,
        AttachStderr: true,
        Tty:          true,
        Cmd:          []string{"/bin/bash"},
    })
    
    attach, _ := h.docker.ContainerExecAttach(ctx, exec.ID, types.ExecStartCheck{
        Tty: true,
    })
    
    // 3. Relay between WebSocket and PTY
    go func() {
        io.Copy(attach.Conn, conn.UnderlyingConn()) // Browser → Container
    }()
    io.Copy(conn.UnderlyingConn(), attach.Conn) // Container → Browser
}
```

**Client-side Terminal Component:**
```tsx
// frontend/components/WebTerminal.tsx
"use client";
import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export function WebTerminal({ lessonId }: { lessonId: string }) {
    const termRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    
    useEffect(() => {
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: "#1a1b26",
                foreground: "#a9b1d6",
            },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
        });
        
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current!);
        fitAddon.fit();
        
        // Connect to PTY endpoint
        const ws = new WebSocket(
            `wss://api.example.com/pty/${lessonId}`
        );
        ws.binaryType = "arraybuffer";
        
        // Terminal → WebSocket (user input)
        term.onData((data) => {
            ws.send(new TextEncoder().encode(data));
        });
        
        // WebSocket → Terminal (PTY output)
        ws.onmessage = (event) => {
            term.write(new Uint8Array(event.data));
        };
        
        wsRef.current = ws;
        
        return () => {
            term.dispose();
            ws.close();
        };
    }, [lessonId]);
    
    return <div ref={termRef} className="h-full w-full" />;
}
```

### Sprint 9 (Week 11): Container Images

Build pre-configured Docker images for each course:

```dockerfile
# docker/linux-course.Dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    bash coreutils findutils grep sed gawk \
    vim nano curl wget git \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /home/student
CMD ["/bin/bash"]
```

```dockerfile
# docker/docker-course.Dockerfile
FROM docker:27-dind
# Docker-in-Docker for learning Docker inside a container
RUN apk add --no-cache bash curl git
WORKDIR /workspace
CMD ["/bin/bash"]
```

```dockerfile
# docker/k8s-course.Dockerfile
FROM alpine:latest
RUN apk add --no-cache kubectl helm bash curl git
WORKDIR /workspace
CMD ["/bin/bash"]
```

```yaml
# docker-compose.yml (dev)
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: bootdev_clone
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes: ["./docker/pgdata:/var/lib/postgresql/data"]
  
  api:
    build: ./backend
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: "postgres://postgres:devpassword@postgres:5432/bootdev_clone"
      DOCKER_HOST: "unix:///var/run/docker.sock"
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"]
  
  # Pre-built course images
  linux-env:
    build: ./docker/linux-course
    image: bootdev-clone/linux:latest
  
  docker-env:
    build: ./docker/docker-course
    image: bootdev-clone/docker:latest
    privileged: true  # Required for DinD
```

### Sprint 10 (Week 12): Terminal Lesson Integration

**Tasks:**
- [ ] Terminal lesson layout (instructions left | terminal right)
- [ ] Lesson-specific container startup with pre-built state
- [ ] Terminal command checkpoint detection (detect when student runs correct commands)
- [ ] Automatic container teardown on lesson completion/idle timeout
- [ ] Resource limits (CPU/memory caps per container)

---

## 8. Phase 4: Training Grounds & Playgrounds (Weeks 13-14)

### Sprint 11 (Week 13): Playground Pages

**Tasks:**
- [ ] `/playground/[lang]` — Free-form code runner for each language
- [ ] Language selector (Python, Go, JS, TS, SQL, C)
- [ ] Reuse execution workers from Phase 2
- [ ] URL hash-based sharing (encode code in URL)
- [ ] No login required

### Sprint 12 (Week 14): Training Grounds

**Tasks:**
- [ ] `/training` — Challenge library page
- [ ] Challenge search/filter (by language, topic, difficulty)
- [ ] Challenge card component with metadata
- [ ] Challenge page with same split-pane as lessons
- [ ] "I'm feeling lucky" random challenge button
- [ ] Simple challenge completion tracking

---

## 9. Phase 5: Polish & Launch (Weeks 15-16)

### Sprint 13 (Week 15): UX Polish

**Tasks:**
- [ ] Responsive design audit (mobile breakpoints)
- [ ] Loading skeletons for course pages
- [ ] Keyboard shortcuts (Ctrl+Enter to run, navigation)
- [ ] Offline indicator / error states
- [ ] Accessibility audit (ARIA labels, keyboard nav, screen reader)
- [ ] SEO meta tags for course pages
- [ ] Vim keybinding support in CodeMirror

### Sprint 14 (Week 16): Launch Prep

**Tasks:**
- [ ] Production deployment (VPS/Cloud)
- [ ] SSL/HTTPS via Caddy
- [ ] CDN for Pyodide/static assets
- [ ] Rate limiting on API
- [ ] Container sandboxing security audit
- [ ] Database backup strategy
- [ ] Monitoring setup (Uptime, error tracking)
- [ ] README with setup instructions for contributors
- [ ] Open-source license (MIT/Apache 2.0)

---

## 10. Infrastructure & DevOps Plan

### Development Environment
```bash
# Start everything with one command
docker compose up

# Services:
# - PostgreSQL on :5432
# - Go API on :8080
# - Next.js dev server on :3000
# - WASM compile service on :8081 (internal)
```

### Production Deployment

**Option A: Single VPS (Budget ~$40-80/month)**
```
Hetzner CX32 (8 vCPU, 16GB RAM)
├── Docker Engine
│   ├── PostgreSQL container
│   ├── Go API container
│   ├── Next.js container
│   └── Course sandbox containers (on-demand)
└── Caddy reverse proxy (auto-HTTPS)
```

**Option B: Cloud (Scalable, ~$100-200/month)**
```
AWS/GCP:
├── RDS/Cloud SQL (PostgreSQL)
├── EC2/Compute Engine (API + PTY containers)
├── S3/Cloud Storage (static assets)
├── CloudFront (CDN)
└── Application Load Balancer
```

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: "1.23" }
      - run: go test ./...
        working-directory: backend
      - run: npm ci && npm run test
        working-directory: frontend

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        run: |
          ssh deploy@${{ secrets.SERVER_IP }} \
            "cd /app && git pull && docker compose up -d --build"
```

---

## 11. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Content scraping legal issues** | Medium | High | Use GitHub curriculum for structure; author original lessons |
| **Go compilation endpoint abuse** | Medium | Medium | Rate-limit, compile cache, max source size |
| **Container escape (security)** | Low | Critical | No privileged containers, seccomp profiles, resource limits, session TTL |
| **Pyodide/SQLite browser performance** | Low | Low | Pre-load Pyodide, stagger lesson loads |
| **WebSocket scaling** | Medium | Medium | Connection pool, idle timeout, horizontal scaling |
| **Course content quality** | High | Medium | Recruit community authors, follow boot.dev's chapter structure strictly |
| **Go/TS path divergence** | Low | Low | Start with Python+Go track only, add TS variant later |
| **Mobile UX** | Medium | Low | CodeMirror works on mobile; limit terminal courses to desktop only |

---

## Summary Timeline

```
Weeks 1-2:  ┃██████████ Phase 0: Scrape & Ingest Content
Weeks 3-6:  ┃████████████████████ Phase 1: Core Platform MVP
Weeks 7-9:  ┃███████████████ Phase 2: Code Execution Engine
Weeks 10-12:┃███████████████ Phase 3: Terminal/PTY Execution  
Weeks 13-14:┃██████████ Phase 4: Playgrounds & Training
Weeks 15-16:┃██████████ Phase 5: Polish & Launch
            ┃
            ▼ LAUNCH 🚀
```

**Total estimated effort:** 16 weeks for a small team (2-3 devs)

---

## Next Steps

1. **Immediate:** Start Phase 0 — clone the GitHub curriculum and build the scraper
2. **Decision needed:** Scrape existing lessons vs. author original content
3. **Decision needed:** Tech stack confirmation (Go vs. Python backend)
4. **Setup:** Initialize repositories and Docker Compose dev environment

---

*This plan is a living document. Update as decisions are made and phases progress.*
