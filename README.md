# 🚀 Boot.dev Clone — Free Interactive Coding Platform

A **free, subscription-free** clone of [boot.dev](https://boot.dev) for learning backend and DevOps engineering through interactive coding lessons, hands-on projects, and a structured curriculum.

**43 courses • 361 chapters • 2,752 lessons • Python, Go, JavaScript, TypeScript, SQL, C**

---

## ✨ Features

- **Interactive Code Editor** — CodeMirror 6 with syntax highlighting, bracket matching, dark theme
- **Real Code Execution** — Python (Pyodide WASM), JavaScript/TypeScript (Web Workers), Go (WASM compilation)
- **Terminal Lessons** — xterm.js terminal emulator with Docker container PTY for CLI/Docker/K8s lessons
- **Multiple Choice Quizzes** — 1,163 quiz lessons with instant feedback
- **Code Playground** — Free online code runner for Python, JS, TS, Go
- **Training Grounds** — Searchable challenge library by language and topic
- **Structured Curriculum** — 3 learning paths (Backend Python+Go, Backend Python+TS, DevOps)
- **No paywalls, no gamification** — Everything is free and open

### Screenshots

| Page | Screenshot |
|------|-----------|
| Homepage | Learning paths, course catalog, stats |
| Course Detail | Full chapter list with lesson links |
| Lesson Viewer | Split-pane: Markdown instructions + CodeMirror editor + Run |
| Playground | Multi-language code runner |
| Training Grounds | Challenge browser with search/filter |
| Terminal CLI | xterm.js with Docker PTY (when backend runs) |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│  Next.js 16 + CodeMirror 6 + xterm.js        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐    │
│  │ Web     │ │ Terminal │ │ Playground │    │
│  │ Workers │ │ xterm.js │ │ Runner     │    │
│  │ (WASM)  │ │ + WSS    │ │            │    │
│  └────┬────┘ └────┬─────┘ └────────────┘    │
└───────┼───────────┼──────────────────────────┘
        │           │
   ┌────▼───┐  ┌────▼──────┐
   │ CDN    │  │ PTY Relay │
   │Pyodide │  │ WebSocket │
   └────────┘  └────┬──────┘
                    │
┌───────────────────▼───────────────────────────┐
│              Go API Server (chi)               │
│  REST: courses, paths, lessons, challenges    │
│  POST /compile/go → WASM                      │
│  WS /pty/{id} → Docker exec PTY               │
│  POST /execute/sql → sqlite3                   │
└────────────────────┬──────────────────────────┘
                     │
┌────────────────────▼──────────────────────────┐
│              PostgreSQL + Docker               │
│  2,752 lessons • 43 courses • 3 paths         │
│  On-demand containers for CLI sessions        │
└───────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

- **Node.js** 18+ 
- **Go** 1.21+ (for backend and Go WASM compilation)
- **PostgreSQL** 16+ (or Docker for containerized DB)
- **Docker** (optional — required for interactive terminal/CLI lessons)
- **sqlite3** (optional — for SQL lesson execution)

---

## 🚀 Quick Start

Choose your setup:

| Guide | Best for |
|-------|----------|
| **[🐳 Docker Install](DOCKER_INSTALL.md)** | Run with Docker — no Go/PostgreSQL/Node needed |
| **[💻 Local Install](LOCAL_INSTALL.md)** | Run directly on your machine — no Docker needed |

**Minimal start (after setup):**

```bash
# Terminal 1: Backend
cd backend && DATABASE_URL="postgres://postgres@localhost:5432/bootdev_clone?sslmode=disable" ./server

# Terminal 2: Frontend
cd frontend && npm install && npm run dev

# → http://localhost:3000
```

---

## 📁 Project Structure

```
boot.dev-copy/
├── backend/                    # Go API server
│   ├── main.go                 # REST API routes, handlers
│   ├── pty_manager.go          # Docker container PTY lifecycle
│   ├── Dockerfile              # Container build
│   ├── migrations/             # SQL schema
│   │   └── 001_schema.sql
│   └── go.mod / go.sum
│
├── frontend/                   # Next.js 16 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # Homepage
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx                # Course catalog
│   │   │   │   └── [slug]/page.tsx         # Course detail
│   │   │   ├── paths/
│   │   │   │   └── [slug]/page.tsx         # Path roadmap
│   │   │   ├── learn/
│   │   │   │   └── [courseSlug]/[lessonId]/
│   │   │   │       ├── page.tsx            # Lesson server page
│   │   │   │       └── LessonClient.tsx    # Client: editor+terminal
│   │   │   ├── playground/
│   │   │   │   └── page.tsx                # Code playground
│   │   │   └── training/
│   │   │       └── page.tsx                # Training grounds
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx              # CodeMirror 6 wrapper
│   │   │   └── WebTerminal.tsx             # xterm.js terminal
│   │   └── hooks/
│   │       └── useCodeExecution.ts         # Execution hook
│   └── public/
│       └── workers/
│           ├── python.worker.js            # Pyodide worker
│           ├── javascript.worker.js        # JS/TS worker
│           └── go.worker.js                # Go WASM worker
│
├── scripts/                    # Database seed script
│   └── seed-db.js
│
├── scraper/                    # Content scraping pipeline
│   ├── parse-curriculum.js     # Parse GitHub curriculum
│   ├── scrape-courses.js       # Playwright course scraper
│   ├── scrape-api.js           # API-based lesson scraper
│   ├── refetch-lessons.js      # Fix missing lesson types
│   └── fix-missing-lessons.js  # Fix data key mismatches
│
├── data/                       # All scraped content
│   ├── lessons-api.json        # 2,752 lessons (11 MB)
│   ├── courses-api.json        # 43 courses with chapters
│   ├── paths-api.json          # 3 learning paths
│   ├── course-summary.json     # Consolidated course list
│   └── lessons/                # Per-course lesson JSONs (43 files)
│
├── curriculum/                 # Cloned bootdotdev/curriculum repo
├── docker/                     # Docker course images
├── docker-compose.yml          # Dev environment
├── .env.example                # Configuration template
└── IMPLEMENTATION_PLAN.md      # Full implementation plan
```

---

## 🔧 Configuration

Copy `.env.example` to `.env` and modify:

```bash
# Database (separate from existing PostgreSQL instances)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=bootdev_clone
DB_USER=bootdev
DB_PASS=bootdev

# Go API Server
API_PORT=8080

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🎯 API Endpoints

### Courses & Content
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/paths` | List all learning paths |
| GET | `/api/v1/paths/{slug}` | Path detail |
| GET | `/api/v1/paths/{slug}/courses` | Courses in a path |
| GET | `/api/v1/courses` | List all courses |
| GET | `/api/v1/courses/{slug}` | Course detail with chapters |
| GET | `/api/v1/courses/{slug}/chapters` | Chapter list |
| GET | `/api/v1/courses/{slug}/lessons` | All lessons in course |
| GET | `/api/v1/courses/{slug}/lessons/{id}` | Single lesson |

### Code Execution
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/compile/go` | Compile Go to WASM |
| POST | `/api/v1/execute/sql` | Execute SQL query |
| POST | `/api/v1/execute/sql/init` | Initialize SQL schema |

### Training
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/challenges` | List challenges (filter: `?language=py&topic=loops`) |
| GET | `/api/v1/challenges/{id}` | Challenge detail |

### Terminal (WebSocket)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/pty/{lessonId}` | WebSocket upgrade → Docker PTY session |
| GET | `/pty/status` | Docker availability status |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | API health check |

---

## 🐳 Docker PTY System

CLI lessons (Linux, Docker, Kubernetes, Git) connect to real shell environments:

```
Browser (xterm.js) → WebSocket → Go backend → docker exec → alpine container
```

- Containers are isolated (`--network none`, 256MB RAM, 0.5 CPU)
- Auto-cleaned after 30-minute idle timeout
- No host system access
- Uses `alpine:latest` as default image (customizable per lesson)

**Requires Docker daemon access.**

---

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://bootdev:bootdev@localhost:5433/bootdev_clone` | PostgreSQL connection |
| `PORT` | `8080` | API server port |
| `DB_HOST` | `localhost` | DB host (seed script) |
| `DB_PORT` | `5433` | DB port (seed script) |
| `DB_NAME` | `bootdev_clone` | DB name |
| `DB_USER` | `bootdev` | DB user |
| `DB_PASS` | `bootdev` | DB password |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Frontend API URL |

---

## 📊 Content Statistics

| Type | Count |
|------|-------|
| Learning Paths | 3 |
| Courses | 43 |
| Chapters | 361 |
| Total Lessons | 2,752 |
| Code Lessons (with starter) | 796 |
| Multiple Choice Questions | 1,163 |
| CLI/Terminal Lessons | 661 |
| GitHub Integration | 53 |
| Interview Practice | 36 |
| Text Input | 43 |

| Language | Lesson Count |
|----------|-------------|
| Python | 550+ |
| Go | 480+ |
| JavaScript | 360+ |
| C | 102 |
| SQL | 66 |

---

## 🔄 Updating Content

To re-scrape the latest content from boot.dev:

```bash
cd scraper
npm install

# 1. Parse curriculum structure
node parse-curriculum.js

# 2. Scrape all lesson content
node scrape-api.js

# 3. Fix any missing lesson types
node refetch-lessons.js

# 4. Generate per-course lesson files
node generate-lesson-files.js

# 5. Re-seed the database
cd ../scripts
node seed-db.js
```

---

## 🤝 Contributing

Contributions welcome! Areas that need work:

- **Frontend tests** — Playwright smoke tests for key pages
- **Mobile responsive** — Currently desktop-optimized
- **Auth system** — OAuth login + progress persistence
- **Go WASM** — Improve Go compiler error formatting
- **Docker PTY** — Custom images per course (K8s, Docker-in-Docker, AWS CLI)
- **SQL editor** — Specialized SQL editor with schema browser

### Adding a new language

1. Create a worker in `frontend/public/workers/{lang}.worker.js`
2. Add language support in `frontend/src/components/CodeEditor.tsx`
3. Add to `frontend/src/hooks/useCodeExecution.ts`
4. Add compilation endpoint in `backend/main.go` if needed

---

## 📄 License

MIT — free for personal, educational, and commercial use.

---

## ⚡ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Editor | CodeMirror 6 (syntax highlighting, dark theme) |
| Terminal | xterm.js 5 (256-color, WebSocket PTY) |
| Backend | Go 1.23, chi router, gorilla/websocket |
| Database | PostgreSQL 16 |
| Containers | Docker (CLI PTY, on-demand) |
| Python Runtime | Pyodide 0.28 (WebAssembly) |
| Go Runtime | WASM compilation (GOOS=js GOARCH=wasm) |
