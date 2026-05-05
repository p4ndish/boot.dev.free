"use client";
// components/WebTerminal.tsx
// xterm.js terminal component with WebSocket PTY support

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

interface WebTerminalProps {
  wsUrl: string | null;
  lessonId: string;
  className?: string;
  readonly?: boolean;
}

export function WebTerminal({ wsUrl, lessonId, className, readonly }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#484f58",
        red: "#ff7b72",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
      disableStdin: false,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstanceRef.current = term;

    // Connect to PTY backend via WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const backendHost = process.env.NEXT_PUBLIC_API_URL 
      ? new URL(process.env.NEXT_PUBLIC_API_URL).host
      : "localhost:8080";
    const wsUrl = `${protocol}//${backendHost}/pty/${lessonId}`;

    connectWebSocket(term, wsUrl, fitAddon);

    // Resize handler
    const handleResize = () => {
      try { fitAddon.fit(); } catch {}
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }));
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, [lessonId]);

  return (
    <div
      ref={terminalRef}
      className={`web-terminal ${className || ""}`}
      style={{ height: "100%", width: "100%" }}
    />
  );
}

function connectWebSocket(term: Terminal, url: string, fitAddon: FitAddon) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${url}`);

  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    term.writeln("\x1b[32m✓ Connected to terminal session\x1b[0m");
    term.write("\r\n\x1b[32m$\x1b[0m ");

    // Send terminal dimensions
    ws.send(JSON.stringify({
      type: "resize",
      cols: term.cols,
      rows: term.rows,
    }));
  };

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      term.write(new Uint8Array(event.data));
    } else {
      // JSON control messages
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "error") {
          term.writeln(`\r\n\x1b[31mError: ${msg.text}\x1b[0m`);
        }
      } catch {
        term.write(event.data);
      }
    }
  };

  ws.onclose = () => {
    term.writeln("\r\n\x1b[33mSession disconnected. Refresh to reconnect.\x1b[0m");
  };

  ws.onerror = () => {
    term.writeln("\r\n\x1b[31mConnection error.\x1b[0m");
  };

  // User input → WebSocket
  term.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(new TextEncoder().encode(data));
    }
  });

  // Resize → WebSocket
  term.onResize(({ cols, rows }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  });
}
