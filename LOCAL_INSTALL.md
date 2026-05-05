# 💻 Local Installation Guide

Run everything directly on your machine — no Docker, no containers.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) or `apt install nodejs npm` |
| **Go** | 1.21+ | [go.dev/dl](https://go.dev/dl/) or `apt install golang-go` |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/) or `apt install postgresql` |

Verify:
```bash
node --version     # ≥ v18
npm --version      # ≥ v9
go version         # ≥ go1.21
psql --version     # ≥ 15
```

### Optional: Docker for Terminal Lessons

| Tool | Purpose |
|------|---------|
| **Docker** | Enables interactive terminal/CLI lessons (Linux, Docker, K8s, Git) |

Without Docker, CLI lessons show "content-only mode". Everything else (Python, Go, JS, SQL, quizzes) works fully.

---

## Step-by-Step Setup

### 1. Clone the repository

```bash
git clone https://github.com/p4ndish/boot.dev.free.git
cd boot.dev.free
```

### 2. Set up PostgreSQL

```bash
# Start PostgreSQL (Ubuntu/Debian)
sudo systemctl start postgresql

# Or on macOS
brew services start postgresql@16

# Create the database
sudo -u postgres createdb bootdev_clone

# Create a user (optional)
sudo -u postgres psql -c "CREATE USER bootdev WITH PASSWORD 'bootdev';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bootdev_clone TO bootdev;"
```

> **Note:** If PostgreSQL is already running on your system (e.g. another project on port 5432), create a second instance or a new database — this won't affect existing databases.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` to match your setup:
```bash
DB_HOST=localhost
DB_PORT=5432          # Default PostgreSQL port
DB_NAME=bootdev_clone
DB_USER=postgres      # Or your user
DB_PASS=              # Your password (if any)
```

### 4. Seed the database

```bash
cd scripts
npm install
node seed-db.js
```

Expected output:
```
📊 Seeding 3 paths...
📚 Seeding 43 courses...
📝 Seeding chapters and lessons...
✅ DATABASE SEED COMPLETE
  Paths: 3
  Courses: 43
  Chapters: 361
  Lessons: 2752
```

### 5. Build and start the Go API

```bash
cd ../backend
go mod download
go build -o server .
DATABASE_URL="postgres://postgres@localhost:5432/bootdev_clone?sslmode=disable" ./server
```

> **Important:** Adjust `DATABASE_URL` to match your PostgreSQL credentials.

The API starts on **http://localhost:8080**. Verify:
```bash
curl http://localhost:8080/health
# → {"status":"ok","service":"boot.dev-clone-api"}
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:3000**. Open it in your browser.

---

## One-Line Start (after setup)

Once everything is configured, start both services:

**Terminal 1 — Backend:**
```bash
cd backend && DATABASE_URL="postgres://postgres@localhost:5432/bootdev_clone?sslmode=disable" ./server
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

---

## Configuration Reference

### `.env` variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `bootdev_clone` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASS` | (empty) | Database password |
| `API_PORT` | `8080` | Go API port |

### Go API environment variables

```bash
# Set before running the API:
DATABASE_URL="postgres://user:pass@host:port/dbname?sslmode=disable"
PORT=8080
```

### Frontend environment

The frontend uses `NEXT_PUBLIC_API_URL` to point to the backend. Default is `http://localhost:8080`.

```bash
# In frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Database Management

```bash
# Connect to PostgreSQL
psql -d bootdev_clone

# Count lessons
psql -d bootdev_clone -c "SELECT COUNT(*) FROM lessons;"

# List courses
psql -d bootdev_clone -c "SELECT slug, title FROM courses ORDER BY slug;"

# Reset and re-seed
psql -d bootdev_clone -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cd scripts && node seed-db.js
```

---

## Enabling Terminal/CLI Lessons

CLI lessons connect to Docker-created shell containers via the Go API's PTY manager.

**Requirements:**
- Docker installed (`docker info` succeeds)
- Docker socket accessible by the Go API process

The API auto-detects Docker on startup. Verify:
```bash
curl http://localhost:8080/pty/status
# → {"docker":true,"sessions":0}
```

If it returns `"docker":false`:
- Install Docker: `sudo apt install docker.io`
- Add yourself to the docker group: `sudo usermod -aG docker $USER`
- Re-login or run: `newgrp docker`
- Restart the API

---

## Troubleshooting

### "cannot find package" during `go build`
```bash
cd backend
go mod tidy
go build -o server .
```

### "connect ECONNREFUSED 127.0.0.1:5432"
PostgreSQL isn't running or port is wrong:
```bash
sudo systemctl status postgresql
psql -h localhost -p 5432 -d postgres -c "SELECT 1"
```

### "role 'postgres' does not exist" on macOS
Homebrew PostgreSQL uses your system user. Use:
```bash
psql -d bootdev_clone
# No -U flag needed
```
And set `DB_USER=` (empty) in `.env`.

### "unrecognized import path" in Go
The Go module imports dependencies. Make sure Go module cache is populated:
```bash
cd backend
go mod download
```

### Port conflicts
If port 8080 is in use:
```bash
# Find what's using it
lsof -i :8080
# Run API on different port
PORT=8081 ./server
# Update frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8081" > frontend/.env.local
```

---

## Updating Content

To re-scrape the latest lessons from boot.dev:

```bash
cd scraper
npm install

# 1. Parse curriculum
node parse-curriculum.js

# 2. Scrape all lessons
node scrape-api.js

# 3. Fix any missing types
node refetch-lessons.js

# 4. Generate per-course files
node generate-lesson-files.js

# 5. Re-seed the database
cd ../scripts
node seed-db.js
```

---

## Development Tips

### Watch Go files for hot reload
Install [air](https://github.com/air-verse/air):
```bash
go install github.com/air-verse/air@latest
cd backend && air
```

### Run with debug logging
```bash
DATABASE_URL="..." ./server 2>&1 | tee api.log
```

### Test individual endpoints
```bash
# List all paths
curl http://localhost:8080/api/v1/paths | jq

# Get a specific course
curl http://localhost:8080/api/v1/courses/learn-code-python | jq

# Get a lesson
curl http://localhost:8080/api/v1/courses/learn-code-python/lessons/78b4646f-85aa-42c7-ba46-faec2f0902a9 | jq
```
