"use client";
// app/playground/page.tsx — Online Code Playground with CodeMirror
import { useState, useCallback } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { useCodeExecution } from "@/hooks/useCodeExecution";

const LANGUAGES = [
  { id: "python", name: "Python 3", ext: "py", default: 'print("Hello, World!")\n' },
  { id: "javascript", name: "JavaScript", ext: "js", default: 'console.log("Hello, World!");\n' },
  { id: "typescript", name: "TypeScript", ext: "ts", default: 'const msg: string = "Hello, World!";\nconsole.log(msg);\n' },
  { id: "go", name: "Go (WASM)", ext: "go", default: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}\n' },
  { id: "sql", name: "SQL", ext: "sql", default: "SELECT 'Hello, World!';\n", disabled: true },
  { id: "c", name: "C", ext: "c", default: '// C support coming soon\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n', disabled: true },
];

export default function PlaygroundPage() {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(language.default);
  const [execCount, setExecCount] = useState(0);
  const { output, isRunning, runCode, clearOutput } = useCodeExecution();

  const handleLanguageChange = (lang: typeof LANGUAGES[0]) => {
    setLanguage(lang);
    if (!lang.disabled) {
      setCode(lang.default);
      clearOutput();
    }
  };

  const handleRun = useCallback(async () => {
    if (language.disabled) return;
    setExecCount(c => c + 1);
    clearOutput();
    await runCode(code, language.id);
  }, [code, language, runCode, clearOutput]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Header */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
        <span className="text-gray-400 text-sm font-semibold">⚡ Playground</span>
        <div className="flex gap-1 ml-6">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                lang.id === language.id
                  ? "bg-gray-700 text-white"
                  : lang.disabled
                  ? "text-gray-600 cursor-not-allowed"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              disabled={lang.disabled}
            >
              {lang.name}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-600">
          ⌘Enter to run • Browser-executed WASM
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language.id}
            onRun={handleRun}
            className="flex-1"
          />

          {/* Run bar */}
          <div className="border-t border-gray-800 p-3 flex gap-3 items-center bg-gray-900 shrink-0">
            <button
              onClick={handleRun}
              disabled={isRunning || language.disabled}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors text-sm"
            >
              {isRunning ? "⏳ Running..." : "▶ Run"}
            </button>
            <span className="text-xs text-gray-600">
              {execCount > 0 && `${execCount} execution${execCount > 1 ? "s" : ""}`}
            </span>
            <span className="ml-auto text-xs text-gray-600">
              {language.ext.toUpperCase()} • WebAssembly • In-browser
            </span>
          </div>
        </div>

        {/* Output */}
        <div className="w-1/3 border-l border-gray-800 flex flex-col bg-gray-900">
          <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm text-gray-400 shrink-0">
            Output
          </div>
          <pre className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap">
            {output || (
              <span className="text-gray-600">Click ▶ Run to execute code</span>
            )}
            {isRunning && <span className="animate-pulse text-yellow-400">▊</span>}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 text-xs text-gray-600 shrink-0">
        <span>Python: Pyodide WebAssembly • JS/TS: Web Workers • Go: WASM Compilation</span>
      </div>
    </div>
  );
}
