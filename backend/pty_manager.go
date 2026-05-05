// backend/pty_manager.go
// Docker container PTY sessions via Docker CLI (not SDK)
// Uses 'docker run', 'docker exec', 'docker rm' directly

package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type PTYManager struct {
	ctx      context.Context
	sessions map[string]*PTYSession
	mu       sync.RWMutex
	dockerOK bool
}

type PTYSession struct {
	ContainerID string
	Conn        *websocket.Conn
	CancelFunc  context.CancelFunc
	CreatedAt   time.Time
}

var defaultImage = "alpine:latest"

func NewPTYManager() *PTYManager {
	// Check if docker is available
	if _, err := exec.LookPath("docker"); err != nil {
		log.Printf("⚠ Docker CLI not found: %v", err)
		return &PTYManager{
			sessions: make(map[string]*PTYSession),
			dockerOK: false,
		}
	}

	// Verify docker daemon is accessible
	cmd := exec.Command("docker", "info")
	if err := cmd.Run(); err != nil {
		log.Printf("⚠ Docker daemon not accessible: %v", err)
		return &PTYManager{
			sessions: make(map[string]*PTYSession),
			dockerOK: false,
		}
	}

	log.Println("✅ Docker CLI ready for PTY sessions")
	return &PTYManager{
		ctx:      context.Background(),
		sessions: make(map[string]*PTYSession),
		dockerOK: true,
	}
}

func (pm *PTYManager) IsAvailable() bool {
	return pm.dockerOK
}

func (pm *PTYManager) CreateSession(conn *websocket.Conn, lessonID string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if !pm.dockerOK {
		conn.WriteMessage(websocket.TextMessage, []byte(
			"\x1b[33mDocker not available. Install Docker to enable interactive terminals.\x1b[0m\r\n$ ",
		))
		return fmt.Errorf("docker not available")
	}

	// Pull image (async, non-blocking)
	go exec.Command("docker", "pull", defaultImage).Run()

	// Create container
	containerID := "bootdev-cli-" + lessonID[:8]

	// Remove old container if exists
	exec.Command("docker", "rm", "-f", containerID).Run()

	createCmd := exec.Command("docker", "run",
		"-d",
		"--name", containerID,
		"--network", "none",
		"--memory", "256m",
		"--cpus", "0.5",
		"--rm",
		"-w", "/workspace",
		defaultImage,
		"sleep", "infinity",
	)
	createOut, err := createCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker run: %s", strings.TrimSpace(string(createOut)))
	}

	actualID := strings.TrimSpace(string(createOut))[:12]

	attachCtx, cancel := context.WithCancel(pm.ctx)

	session := &PTYSession{
		ContainerID: actualID,
		Conn:        conn,
		CancelFunc:  cancel,
		CreatedAt:   time.Now(),
	}
	pm.sessions[lessonID] = session

	// Start relay goroutines
	go pm.relayInput(lessonID, session, containerID)
	go pm.relayOutput(lessonID, session, containerID, attachCtx)

	// Idle timeout cleanup
	go func() {
		select {
		case <-time.After(30 * time.Minute):
			pm.cleanupSession(lessonID)
		case <-attachCtx.Done():
		}
	}()

	log.Printf("✅ PTY session: %s (container: %s)", lessonID, actualID)
	return nil
}

func (pm *PTYManager) relayInput(lessonID string, session *PTYSession, containerID string) {
	defer session.CancelFunc()

	// Create exec for input
	execCmd := exec.Command("docker", "exec", "-i", containerID, "/bin/sh")
	stdin, err := execCmd.StdinPipe()
	if err != nil {
		return
	}
	defer stdin.Close()

	if err := execCmd.Start(); err != nil {
		return
	}

	for {
		_, message, err := session.Conn.ReadMessage()
		if err != nil {
			return
		}
		stdin.Write(message)
	}
}

func (pm *PTYManager) relayOutput(lessonID string, session *PTYSession, containerID string, ctx context.Context) {
	defer pm.cleanupSession(lessonID)

	// Separate shell for output
	execCmd := exec.Command("docker", "exec", containerID, "/bin/sh", "-c",
		"echo 'Shell ready.' && exec /bin/sh 2>&1")
	stdout, err := execCmd.StdoutPipe()
	if err != nil {
		return
	}
	stderr, _ := execCmd.StderrPipe()

	if err := execCmd.Start(); err != nil {
		return
	}

	reader := bufio.NewReader(io.MultiReader(stdout, stderr))
	buf := make([]byte, 4096)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		n, err := reader.Read(buf)
		if n > 0 {
			session.Conn.WriteMessage(websocket.BinaryMessage, buf[:n])
		}
		if err != nil {
			return
		}
	}
}

func (pm *PTYManager) cleanupSession(lessonID string) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	session, exists := pm.sessions[lessonID]
	if !exists {
		return
	}

	if session.CancelFunc != nil {
		session.CancelFunc()
	}
	if session.Conn != nil {
		session.Conn.Close()
	}

	// Stop container
	exec.Command("docker", "stop", "--time", "2", session.ContainerID).Run()
	exec.Command("docker", "rm", "-f", session.ContainerID).Run()

	delete(pm.sessions, lessonID)
	log.Printf("🧹 Session cleaned: %s", lessonID)
}

func (pm *PTYManager) Shutdown() {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for id := range pm.sessions {
		pm.cleanupSession(id)
	}
	log.Println("✅ All PTY sessions cleaned up")
}

// Serve a simple status check
func (pm *PTYManager) handleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if pm.dockerOK {
		fmt.Fprintf(w, `{"docker":true,"sessions":%d}`, len(pm.sessions))
	} else {
		w.Write([]byte(`{"docker":false,"message":"Docker not available"}`))
	}
}
