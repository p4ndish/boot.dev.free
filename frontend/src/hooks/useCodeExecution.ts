// hooks/useCodeExecution.ts
// Unified code execution hook for all languages (Python, JS, TS, Go)

"use client";
import { useState, useCallback, useRef } from "react";

interface WorkerMap {
  [key: string]: Worker | null;
}

interface ExecutionResult {
  output: string;
  error: string | null;
  duration: number;
}

export function useCodeExecution() {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workers = useRef<WorkerMap>({});
  const outputRef = useRef("");
  const errorRef = useRef<string | null>(null);

  const getWorker = useCallback((language: string): Worker => {
    if (workers.current[language]) {
      return workers.current[language]!;
    }

    const workerScripts: Record<string, string> = {
      python: "/workers/python.worker.js",
      javascript: "/workers/javascript.worker.js",
      typescript: "/workers/javascript.worker.js",
      go: "/workers/go.worker.js",
      golang: "/workers/go.worker.js",
    };

    const scriptUrl = workerScripts[language] || workerScripts.python;
    const worker = new Worker(scriptUrl);
    workers.current[language] = worker;

    worker.onmessage = (event) => {
      const { type, text, error: workerError } = event.data;
      if (type === "stdout" || type === "stderr") {
        outputRef.current += text || "";
        setOutput(outputRef.current);
      }
      if (type === "error" || workerError) {
        errorRef.current = text || workerError;
        setError(text || workerError);
        outputRef.current += `\n❌ Error: ${text || workerError}\n`;
        setOutput(outputRef.current);
      }
      if (type === "done") {
        setIsRunning(false);
      }
    };

    if (language === "python") {
      worker.postMessage({ type: "init" });
    }

    return worker;
  }, []);

  const runCode = useCallback(async (
    code: string,
    language: string,
    files?: { name: string; content: string; isHidden?: boolean }[]
  ): Promise<ExecutionResult> => {
    setIsRunning(true);
    setError(null);
    errorRef.current = null;
    outputRef.current = "";
    setOutput("");

    const startTime = performance.now();
    const worker = getWorker(language);

    return new Promise((resolve) => {
      const doneHandler = (event: MessageEvent) => {
        if (event.data.type === "done") {
          worker.removeEventListener("message", doneHandler);
          const duration = performance.now() - startTime;
          setIsRunning(false);
          resolve({
            output: outputRef.current,
            error: errorRef.current,
            duration,
          });
        }
      };

      worker.addEventListener("message", doneHandler);
      worker.postMessage({ type: "run", code, files });
    });
  }, [getWorker]);

  const clearOutput = useCallback(() => {
    setOutput("");
    setError(null);
    errorRef.current = null;
    outputRef.current = "";
  }, []);

  return { output, isRunning, error, runCode, clearOutput };
}
