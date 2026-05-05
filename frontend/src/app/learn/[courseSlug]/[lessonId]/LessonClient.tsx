"use client";
// app/learn/[courseSlug]/[lessonId]/LessonClient.tsx
// Updated with CodeMirror 6 editor + xterm.js terminal

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { CodeEditor } from "@/components/CodeEditor";
import { WebTerminal } from "@/components/WebTerminal";
import { useCodeExecution } from "@/hooks/useCodeExecution";

interface StarterFile {
  name: string;
  content: string;
  isHidden?: boolean;
  isReadonly?: boolean;
}

interface LessonData {
  uuid: string;
  title: string;
  type: string;
  chapterTitle: string;
  language?: string;
  readme?: string;
  topics?: string[];
  starterFiles?: StarterFile[];
  expectedOutput?: string;
  question?: {
    question: string;
    answers: string[];
    correctAnswer: string;
  };
  cliData?: any;
  githubChecksData?: any;
}

interface Props {
  lesson: LessonData;
  courseSlug: string;
  nextUUID: string | null;
}

function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return "python";
  const l = lang.toLowerCase();
  if (l === "py" || l.includes("python")) return "python";
  if (l === "js" || l.includes("javascript")) return "javascript";
  if (l === "ts" || l.includes("typescript")) return "typescript";
  if (l === "go" || l.includes("golang")) return "go";
  if (l === "sql") return "sql";
  if (l === "c" || l.includes("memory")) return "c";
  return "python";
}

export function LessonClient({ lesson, courseSlug, nextUUID }: Props) {
  const [code, setCode] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [execCount, setExecCount] = useState(0);
  const { output, isRunning, runCode, clearOutput } = useCodeExecution();

  const language = normalizeLanguage(lesson.language);
  const isCodeLesson =
    lesson.type === "type_code" ||
    lesson.type === "type_code_tests" ||
    lesson.type === "type_code_sql";
  const isChoiceLesson = lesson.type === "type_choice";
  const isCliLesson = lesson.type === "type_cli";

  // Initialize code from starter files
  useEffect(() => {
    if (lesson.starterFiles?.[0]?.content && code === "") {
      setCode(lesson.starterFiles[0].content);
    }
  }, [lesson.uuid]);

  const handleRun = useCallback(async () => {
    setExecCount(c => c + 1);
    clearOutput();
    const files = lesson.starterFiles?.map(f => ({
      name: f.name,
      content: f.name === lesson.starterFiles![0]?.name ? code : f.content,
      isHidden: f.isHidden,
    }));
    await runCode(code, language, files);
  }, [code, language, lesson.starterFiles, runCode, clearOutput]);

  const editorCode = lesson.starterFiles?.[0]?.content || "";
  const activeCode = code || editorCode;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Instructions panel */}
      <div className="w-1/2 overflow-y-auto border-r border-gray-800 p-6">
        <h1 className="text-xl font-bold mb-4 text-yellow-300">
          {lesson.title}
        </h1>

        {lesson.readme && (
          <div className="prose prose-invert prose-sm max-w-none mb-6">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 className="text-lg font-bold mt-6 mb-3 text-yellow-200">{children}</h2>
                ),
                h2: ({ children }) => (
                  <h3 className="text-base font-semibold mt-4 mb-2 text-yellow-200">{children}</h3>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded text-yellow-300 text-sm">
                    {String(children)}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto text-sm my-3">
                    {children}
                  </pre>
                ),
                p: ({ children }) => <p className="mb-3 text-gray-300 leading-relaxed">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-300">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-300">{children}</ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-yellow-500/50 pl-4 py-2 my-3 bg-gray-900/50 rounded-r text-gray-400 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {lesson.readme}
            </ReactMarkdown>
          </div>
        )}

        {/* Multiple choice */}
        {isChoiceLesson && lesson.question && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">{lesson.question.question}</h3>
            <div className="space-y-2">
              {lesson.question.answers.map((answer) => {
                const isSelected = selectedAnswer === answer;
                const isCorrect = answer === lesson.question!.correctAnswer;
                const showResult = showCorrect && isSelected;

                return (
                  <button
                    key={answer}
                    onClick={() => { setSelectedAnswer(answer); setShowCorrect(true); }}
                    disabled={showCorrect}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      showCorrect
                        ? isCorrect
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : isSelected
                          ? "border-red-500 bg-red-500/10 text-red-300"
                          : "border-gray-700 bg-gray-900 text-gray-500"
                        : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {answer}
                    {showCorrect && isCorrect && " ✓"}
                    {showCorrect && isSelected && !isCorrect && " ✗"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Topics */}
        {lesson.topics && lesson.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {lesson.topics.map((topic) => (
              <span key={topic} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: Code Editor or Terminal */}
      <div className="w-1/2 flex flex-col bg-gray-900">
        {isCodeLesson && (
          <>
            <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm text-gray-400 shrink-0">
              <span className="font-mono text-xs">
                {lesson.starterFiles?.[0]?.name || "main.py"}
                {execCount > 0 && (
                  <span className="ml-2 text-gray-600">({execCount} run{execCount > 1 ? "s" : ""})</span>
                )}
              </span>
              <span className="ml-auto text-xs text-gray-500 tabular-nums">
                {language.toUpperCase()}
              </span>
            </div>

            <CodeEditor
              value={activeCode}
              onChange={setCode}
              language={language}
              onRun={handleRun}
              className="flex-1"
            />

            <div className="border-t border-gray-700 p-4 shrink-0">
              <div className="flex gap-3 mb-3">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors text-sm"
                >
                  {isRunning ? "⏳ Running..." : "▶ Run"}
                  <span className="ml-1 text-xs opacity-60">(⌘Enter)</span>
                </button>

                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-semibold text-sm"
                >
                  {showSolution ? "Hide" : "💡 Solution"}
                </button>

                {nextUUID && (
                  <Link
                    href={`/learn/${courseSlug}/${nextUUID}`}
                    className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 rounded-lg font-bold text-sm ml-auto"
                  >
                    Submit →
                  </Link>
                )}
              </div>

              {output && (
                <pre className="bg-gray-950 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-auto max-h-64 border border-gray-800 whitespace-pre-wrap">
                  {output}
                  {isRunning && <span className="animate-pulse text-yellow-400">▊</span>}
                </pre>
              )}

              {showSolution && lesson.starterFiles && (
                <div className="mt-3 bg-gray-800 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold text-sm mb-2">Solution:</h4>
                  <pre className="text-green-300 font-mono text-sm overflow-auto max-h-48 whitespace-pre-wrap">
                    {lesson.starterFiles.map((f) => (
                      <div key={f.name}>
                        <span className="text-gray-500"># {f.name}</span>
                        {"\n"}
                        {f.content}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {isCliLesson && (
          <>
            <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm text-gray-400 shrink-0">
              <span className="font-mono text-xs">Terminal</span>
              <span className="ml-auto text-xs text-gray-500">CLI</span>
            </div>
            <WebTerminal
              lessonId={lesson.uuid}
              wsUrl={null}
              className="flex-1"
            />
          </>
        )}

        {!isCodeLesson && !isChoiceLesson && !isCliLesson && (
          <div className="flex-1 flex items-center justify-center text-gray-500 p-8 text-center">
            <div>
              <div className="text-4xl mb-4 text-gray-600">📖</div>
              <p className="text-lg text-gray-400">
                {lesson.type.replace("type_", "").replace(/_/g, " ").toUpperCase()}
              </p>
              <p className="text-sm mt-2 text-gray-600">
                {lesson.type === "type_github_checks"
                  ? "GitHub exercise — submit your repo and check results."
                  : `${lesson.type} exercise — interactive UI coming soon.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
