# 🐳 Docker Installation Guide

Run everything in containers — no local Go, Node.js, or PostgreSQL required.

---

## Prerequisites

- **Docker** (v20+) and **Docker Compose** (v2+)
  - [Install Docker](https://docs.docker.com/get-docker/)
  - Verify: `docker --version && docker compose version`

---

## Quick Start (3 steps)

### 1. Clone the repository

```bash
git clone https://github.com/p4ndish/boot.dev.free.git
cd boot.dev.free
```

### 2. Start all services

```bash
docker compose up -d
```

> If you see `container name already in use`, clean up any leftover containers:
> ```bash
> docker rm -f bootdev-clone-db bootdev-clone-api 2>/dev/null
> docker compose up -d
> ```

This starts:
- **PostgreSQL** on port `5433` (container: `bootdev-clone-db`)
- **Go API** on port `8080` (container: `bootdev-clone-api`)

The database is auto-created. The API has access to the `data/` directory (mounted as a volume) and the Docker socket (for PTY terminal sessions).

### 3. Seed the database

Wait for PostgreSQL to be ready (healthcheck passes), then seed:

```bash
docker compose exec api sh -c "apk add --no-cache nodejs npm postgresql-client && cd /scripts && npm install && DB_HOST=postgres DB_PORT=5432 DB_NAME=bootdev_clone DB_USER=bootdev DB_PASS=bootdev node seed-db.js"
```

Or if you have Node.js locally:
```bash
cd scripts && npm install && DB_HOST=localhost DB_PORT=5433 DB_NAME=bootdev_clone DB_USER=bootdev DB_PASS=bootdev node seed-db.js
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

**Open http://localhost:3000**

---

## Service Overview

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL | `bootdev-clone-db` | 5433 | Course & lesson data |
| Go API | `bootdev-clone-api` | 8080 | REST API + WebSocket PTY |
| Frontend | (runs locally) | 3000 | Next.js web app |

---

## Useful Commands

```bash
# View logs
docker compose logs -f api
docker compose logs -f postgres

# Check API health
curl http://localhost:8080/health

# Check PTY/Docker status
curl http://localhost:8080/pty/status

# Restart a service
docker compose restart api

# Stop everything
docker compose down

# Stop and delete data (⚠ destroys database!)
docker compose down -v
```

---

## Enabling Terminal/CLI Lessons

CLI lessons (Linux, Docker, K8s, Git) require interactive Docker containers. The Docker socket is mounted into the API container:

```yaml
# docker-compose.yml (already configured)
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This lets the API run `docker run`, `docker exec`, and `docker rm` to create sandboxed shell environments. Each terminal session gets an isolated `alpine:latest` container with:
- No network access (`--network none`)
- 256MB RAM limit
- 0.5 CPU cap
- Auto-cleanup after 30 minutes

**Verify it works:**
```bash
curl http://localhost:8080/pty/status
# Should return: {"docker":true,"sessions":0}
```

If it returns `"docker":false`, ensure:
- Docker daemon is running (`docker info`)
- Docker socket path is correct (`/var/run/docker.sock`)
- API container has volume mount for the socket

---

## Database Management

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U bootdev -d bootdev_clone

# Count lessons
docker compose exec postgres psql -U bootdev -d bootdev_clone -c "SELECT COUNT(*) FROM lessons;"

# List courses
docker compose exec postgres psql -U bootdev -d bootdev_clone -c "SELECT slug, title FROM courses ORDER BY slug;"

# Reset database
docker compose down -v
docker compose up -d
# Then re-seed
```

---

## Troubleshooting

### "port is already allocated"
```
Error: port 5433 is already allocated
```
Another PostgreSQL instance is using that port. Edit `docker-compose.yml` and change `5433:5432` to a different host port, e.g. `5434:5432`.

### "Docker socket not found"
The API can't access Docker for PTY sessions. Verify:
```bash
ls -la /var/run/docker.sock
```
If missing, install Docker or skip PTY — the API works fine without it.

### "go build failed" during build
The Go build needs internet access to download dependencies. Ensure Docker can reach the internet. On corporate networks, configure proxy:
```yaml
environment:
  HTTP_PROXY: http://proxy:8080
  HTTPS_PROXY: http://proxy:8080
```

### "Cannot connect to database"
Check if PostgreSQL is healthy:
```bash
docker compose ps
# postgres should show "healthy"
```

---

## Customization

### Change ports
Edit `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"    # API on 8081 instead of 8080
```

### Use existing PostgreSQL
Comment out the `postgres` service and set `DATABASE_URL`:
```yaml
environment:
  DATABASE_URL: "postgres://user:pass@your-host:5432/dbname"
```
