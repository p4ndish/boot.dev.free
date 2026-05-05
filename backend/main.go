package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
)

var db *sql.DB
var ptyManager *PTYManager

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev
	},
}

func main() {
	// Database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://bootdev:bootdev@localhost:5432/bootdev_clone?sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Printf("⚠ Database not connected: %v (running without DB)", err)
	} else if err = db.Ping(); err != nil {
		log.Printf("⚠ Database ping failed: %v (running without DB)", err)
	} else {
		log.Println("✅ Database connected")
	}

	// Initialize PTY manager
	ptyManager = NewPTYManager()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001", "http://38.242.155.107:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/paths", listPaths)
		r.Get("/paths/{slug}", getPath)
		r.Get("/paths/{slug}/courses", getPathCourses)
		r.Get("/courses", listCourses)
		r.Get("/courses/{slug}", getCourse)
		r.Get("/courses/{slug}/chapters", getCourseChapters)
		r.Get("/courses/{slug}/lessons", getCourseLessons)
		r.Get("/courses/{slug}/lessons/{lessonID}", getLesson)
		r.Get("/challenges", listChallenges)
		r.Get("/challenges/{id}", getChallenge)

		// Code compilation
		r.Post("/compile/go", compileGo)

		// SQL execution
		r.Post("/execute/sql", handleSQLQuery)
		r.Post("/execute/sql/init", handleSQLInit)
	})

	// WebSocket PTY endpoint for terminal lessons
	r.Get("/pty/{lessonID}", handlePTY)
	r.Get("/pty/status", ptyManager.handleStatus)

	fmt.Printf("🚀 API server on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// ============================================================
// Handlers using scraped JSON data
// ============================================================

func loadJSON(filename string) (map[string]interface{}, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result.(map[string]interface{}), nil
}

func loadJSONArray(filename string) ([]interface{}, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var result []interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func errorResponse(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func listPaths(w http.ResponseWriter, r *http.Request) {
	paths, err := loadJSONArray("../data/paths-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}
	jsonResponse(w, paths)
}

func getPath(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	paths, err := loadJSONArray("../data/paths-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	for _, p := range paths {
		path := p.(map[string]interface{})
		if path["slug"] == slug {
			jsonResponse(w, path)
			return
		}
	}
	errorResponse(w, 404, "path not found")
}

func getPathCourses(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	paths, err := loadJSONArray("../data/paths-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	courses, err := loadJSON("../data/courses-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	for _, p := range paths {
		path := p.(map[string]interface{})
		if path["slug"] == slug {
			uuids := path["courseUUIDs"].([]interface{})
			var result []interface{}
			for _, uuid := range uuids {
				if c, ok := courses[uuid.(string)]; ok {
					result = append(result, c)
				}
			}
			jsonResponse(w, result)
			return
		}
	}
	errorResponse(w, 404, "path not found")
}

func listCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := loadJSON("../data/courses-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	// Convert map to array
	var result []interface{}
	for _, c := range courses {
		result = append(result, c)
	}
	jsonResponse(w, result)
}

func getCourse(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	courses, err := loadJSON("../data/courses-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	for _, c := range courses {
		course := c.(map[string]interface{})
		if course["slug"] == slug {
			jsonResponse(w, course)
			return
		}
	}
	errorResponse(w, 404, "course not found")
}

func getCourseChapters(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	courses, err := loadJSON("../data/courses-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	for _, c := range courses {
		course := c.(map[string]interface{})
		if course["slug"] == slug {
			if chapters, ok := course["chapters"]; ok {
				jsonResponse(w, chapters)
				return
			}
		}
	}
	errorResponse(w, 404, "course not found")
}

func getCourseLessons(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	
	// Try per-course lessons file first
	lessonFile := fmt.Sprintf("../data/lessons/%s.json", slug)
	lessons, err := loadJSON(lessonFile)
	if err != nil {
		// Fall back to courses-api.json for lesson metadata
		courses, err := loadJSON("../data/courses-api.json")
		if err != nil {
			errorResponse(w, 500, err.Error())
			return
		}

		for _, c := range courses {
			course := c.(map[string]interface{})
			if course["slug"] == slug {
				var allLessons []interface{}
				if chapters, ok := course["chapters"]; ok {
					for _, ch := range chapters.([]interface{}) {
						chapter := ch.(map[string]interface{})
						if chapterLessons, ok := chapter["lessons"]; ok {
							allLessons = append(allLessons, chapterLessons.([]interface{})...)
						}
					}
				}
				jsonResponse(w, allLessons)
				return
			}
		}
		errorResponse(w, 404, "course not found")
		return
	}

	jsonResponse(w, lessons)
}

func getLesson(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	lessonID := chi.URLParam(r, "lessonID")

	// Load all lessons
	allLessons, err := loadJSON("../data/lessons-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	if lesson, ok := allLessons[lessonID]; ok {
		jsonResponse(w, lesson)
		return
	}

	// Try numeric index into course lessons
	if idx, err := strconv.Atoi(lessonID); err == nil {
		lessonFile := fmt.Sprintf("../data/lessons/%s.json", slug)
		courseLessons, err := loadJSONArray(lessonFile)
		if err == nil && idx < len(courseLessons) {
			jsonResponse(w, courseLessons[idx])
			return
		}
	}

	errorResponse(w, 404, "lesson not found")
}

func listChallenges(w http.ResponseWriter, r *http.Request) {
	// Filter lessons that are challenge-like (type_code_tests, type_code)
	allLessons, err := loadJSON("../data/lessons-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	lang := r.URL.Query().Get("language")
	topic := r.URL.Query().Get("topic")
	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil {
			limit = parsed
		}
	}

	var challenges []interface{}
	for id, l := range allLessons {
		lesson := l.(map[string]interface{})
		lType := getString(lesson, "type")
		
		// Only include code lessons as challenges
		if lType != "type_code" && lType != "type_code_tests" && lType != "type_code_sql" {
			continue
		}

		// Filter by language
		if lang != "" {
			lLang := getString(lesson, "language")
			if !strings.EqualFold(lLang, lang) {
				continue
			}
		}

		// Filter by topic
		if topic != "" {
			topics := lesson["topics"]
			matches := false
			if topics != nil {
				for _, t := range topics.([]interface{}) {
					if strings.Contains(strings.ToLower(t.(string)), strings.ToLower(topic)) {
						matches = true
						break
					}
				}
			}
			if !matches {
				continue
			}
		}

		challenge := map[string]interface{}{
			"id":          id,
			"title":       getString(lesson, "title"),
			"language":    getString(lesson, "language"),
			"topics":      lesson["topics"],
			"difficulty":  lesson["difficulty"],
			"courseTitle": getString(lesson, "courseTitle"),
			"type":        lType,
		}
		challenges = append(challenges, challenge)

		if len(challenges) >= limit {
			break
		}
	}

	jsonResponse(w, challenges)
}

func getChallenge(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	allLessons, err := loadJSON("../data/lessons-api.json")
	if err != nil {
		errorResponse(w, 500, err.Error())
		return
	}

	if lesson, ok := allLessons[id]; ok {
		jsonResponse(w, lesson)
		return
	}
	errorResponse(w, 404, "challenge not found")
}

// ============================================================
// Compilation handlers
// ============================================================

func compileGo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid request body")
		return
	}

	if req.Source == "" {
		errorResponse(w, 400, "source code is required")
		return
	}

	// Check if Go is available
	goBin := "go"
	if envGo := os.Getenv("GOROOT"); envGo != "" {
		goBin = filepath.Join(envGo, "bin", "go")
	}
	if _, err := exec.LookPath(goBin); err != nil {
		errorResponse(w, 501, "Go compiler not available on this server")
		return
	}

	// Create temp workspace
	dir, err := os.MkdirTemp("", "go-wasm-*")
	if err != nil {
		errorResponse(w, 500, "failed to create temp dir")
		return
	}
	defer os.RemoveAll(dir)

	// Write source and go.mod
	os.WriteFile(filepath.Join(dir, "main.go"), []byte(req.Source), 0644)
	os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module main\n\ngo 1.21\n"), 0644)

	// Compile to WASM
	cmd := exec.Command(goBin, "build", "-o", "main.wasm", "main.go")
	cmd.Dir = dir
	cmd.Env = append(os.Environ(),
		"GOOS=js",
		"GOARCH=wasm",
		"GOPATH="+os.TempDir()+"/gopath",
		"HOME="+os.TempDir(),
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		errMsg := stderr.String()
		if errMsg == "" {
			errMsg = err.Error()
		}
		errorResponse(w, 400, strings.TrimSpace(errMsg))
		return
	}

	// Read compiled WASM
	wasmBytes, err := os.ReadFile(filepath.Join(dir, "main.wasm"))
	if err != nil {
		errorResponse(w, 500, "failed to read compiled WASM")
		return
	}

	w.Header().Set("Content-Type", "application/wasm")
	w.Header().Set("Content-Length", strconv.Itoa(len(wasmBytes)))
	w.Write(wasmBytes)
}

func handlePTY(w http.ResponseWriter, r *http.Request) {
	lessonID := chi.URLParam(r, "lessonID")

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("PTY WebSocket upgrade failed: %v", err)
		return
	}

	if ptyManager == nil || !ptyManager.IsAvailable() {
		msg := "\x1b[1;33m┌──────────────────────────────────────┐\r\n" +
			"│  Docker not available on server     │\r\n" +
			"│  Install Docker for interactive     │\r\n" +
			"│  terminal sessions (CLI, Docker,    │\r\n" +
			"│  Kubernetes, Git, Linux courses).   │\r\n" +
			"│                                      │\r\n" +
			"│  For now: content-only mode.        │\r\n" +
			"└──────────────────────────────────────┘\x1b[0m\r\n$ "
		conn.WriteMessage(websocket.TextMessage, []byte(msg))
		conn.Close()
		return
	}

	if err := ptyManager.CreateSession(conn, lessonID); err != nil {
		log.Printf("PTY session failed: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte(
			fmt.Sprintf("\x1b[31mFailed to create terminal session: %v\x1b[0m\r\n", err),
		))
		conn.Close()
	}
}

// ============================================================
// SQL Execution handlers
// ============================================================

type sqlQueryReq struct {
	Query string `json:"query"`
}

func handleSQLQuery(w http.ResponseWriter, r *http.Request) {
	var req sqlQueryReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid request")
		return
	}

	// Try to execute using sqlite3 binary if available
	output, err := exec.Command("sqlite3", ":memory:", "-header", "-separator", "\t", req.Query).CombinedOutput()
	if err != nil {
		errorResponse(w, 400, string(output))
		return
	}

	// Parse output
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) == 0 {
		jsonResponse(w, map[string]interface{}{"columns": []string{}, "rows": []interface{}{}})
		return
	}

	columns := strings.Split(lines[0], "\t")
	var rows []interface{}
	for _, line := range lines[1:] {
		if strings.TrimSpace(line) == "" {
			continue
		}
		cells := strings.Split(line, "\t")
		row := make([]interface{}, len(cells))
		for i, cell := range cells {
			row[i] = strings.TrimSpace(cell)
		}
		rows = append(rows, row)
	}

	jsonResponse(w, map[string]interface{}{
		"columns": columns,
		"rows":    rows,
	})
}

type sqlInitReq struct {
	Schema string `json:"schema"`
}

func handleSQLInit(w http.ResponseWriter, r *http.Request) {
	var req sqlInitReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, 400, "invalid request")
		return
	}

	if _, err := exec.LookPath("sqlite3"); err != nil {
		jsonResponse(w, map[string]string{"status": "ok", "note": "sqlite3 not installed, schema will be applied at query time"})
		return
	}

	jsonResponse(w, map[string]string{"status": "ok"})
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
