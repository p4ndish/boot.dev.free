"use client";
// app/learn/[courseSlug]/[lessonId]/LessonClient.tsx
// v4: Multi-file tabs, improved quiz, boot.dev nav style

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
  const language = normalizeLanguage(lesson.language);
  const visibleFiles = (lesson.starterFiles || []).filter((f) => !f.isHidden);
  const hasMultipleFiles = visibleFiles.length > 1;
  const isCodeLesson =
    lesson.type === "type_code" ||
    lesson.type === "type_code_tests" ||
    lesson.type === "type_code_sql";
  const isChoiceLesson = lesson.type === "type_choice";
  const isCliLesson = lesson.type === "type_cli";

  // File tab state
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [fileContents, setFileContents] = useState<Record<number, string>>({});

  // Initialize file contents
  useEffect(() => {
    const contents: Record<number, string> = {};
    visibleFiles.forEach((f, i) => {
      contents[i] = f.content;
    });
    setFileContents(contents);
    setActiveFileIndex(0);
  }, [lesson.uuid]);

  const activeFile = visibleFiles[activeFileIndex];
  const activeContent = fileContents[activeFileIndex] || "";

  // Code execution
  const [showSolution, setShowSolution] = useState(false);
  const [execCount, setExecCount] = useState(0);
  const { output, isRunning, runCode, clearOutput } = useCodeExecution();

  const handleRun = useCallback(async () => {
    setExecCount((c) => c + 1);
    clearOutput();
    const runFiles = visibleFiles.map((f, i) => ({
      name: f.name,
      content: fileContents[i] || f.content,
      isHidden: false,
    }));
    await runCode(activeContent, language, runFiles);
  }, [activeContent, language, visibleFiles, fileContents, runCode, clearOutput]);

  // Quiz state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [quizRetries, setQuizRetries] = useState(0);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ===== LEFT PANEL: Instructions ===== */}
      <div className="w-1/2 overflow-y-auto border-r border-gray-800 p-6">
        {/* Chapter breadcrumb */}
        <div className="text-xs text-gray-600 mb-2 font-mono">
          {lesson.chapterTitle}
        </div>

        <h1 className="text-2xl font-bold mb-4 text-yellow-300">
          {lesson.title}
        </h1>

        {/* Lesson type badge */}
        <div className="flex flex-wrap gap-2 mb-4">
          {lesson.type !== "type_code" && (
            <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded text-xs font-mono">
              {lesson.type.replace("type_", "").replace("_", " ")}
            </span>
          )}
          {lesson.topics?.slice(0, 3).map((t) => (
            <span key={t} className="px-2 py-0.5 bg-gray-800/50 text-gray-600 rounded text-xs">
              {t}
            </span>
          ))}
        </div>

        {/* Readme content */}
        {lesson.readme && (
          <div className="prose prose-invert prose-sm max-w-none mb-6">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h2 className="text-lg font-bold mt-6 mb-3 text-yellow-200">{children}</h2>,
                h2: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-2 text-yellow-200/80">{children}</h3>,
                code: ({ children }) => (
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded text-yellow-300 text-sm">{String(children)}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto text-sm my-3">{children}</pre>
                ),
                p: ({ children }) => <p className="mb-3 text-gray-300 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-gray-300">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-gray-300">{children}</ol>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-yellow-500/30 pl-4 py-2 my-3 bg-gray-900/50 rounded-r text-gray-400 italic">{children}</blockquote>
                ),
              }}
            >
              {lesson.readme}
            </ReactMarkdown>
          </div>
        )}

        {/* Multiple Choice Quiz */}
        {isChoiceLesson && lesson.question && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-200 mb-4">
              {lesson.question.question}
            </h3>
            <div className="space-y-2">
              {lesson.question.answers.map((answer) => {
                const isSelected = selectedAnswer === answer;
                const isCorrect = answer === lesson.question!.correctAnswer;
                const show = showCorrect && isSelected;
                return (
                  <button
                    key={answer}
                    onClick={() => {
                      if (showCorrect && !isCorrect) {
                        setQuizRetries((r) => r + 1);
                      }
                      setSelectedAnswer(answer);
                      setShowCorrect(true);
                    }}
                    className={`w-full text-left p-4 rounded-lg border text-sm transition-all ${
                      showCorrect
                        ? isCorrect
                          ? "border-green-500/60 bg-green-500/10 text-green-300"
                          : "border-red-500/40 bg-red-500/5 text-red-400"
                        : isSelected
                        ? "border-yellow-500/40 bg-yellow-500/5 text-gray-200"
                        : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                    }`}
                  >
                    <span className="inline-block w-5 text-gray-600 text-xs mr-2">
                      {"ABCDEFGH"[lesson.question!.answers.indexOf(answer)]}.
                    </span>
                    {answer}
                    {showCorrect && isCorrect && (
                      <span className="ml-2 text-green-400 text-xs font-bold">✓ Correct</span>
                    )}
                  </button>
                );
              })}
            </div>
            {showCorrect && quizRetries > 0 && (
              <p className="mt-4 text-xs text-gray-600">
                {quizRetries} attempt{quizRetries > 1 ? "s" : ""}. The correct answer is highlighted.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ===== RIGHT PANEL: Editor / Terminal / Quiz-only ===== */}
      <div className="w-1/2 flex flex-col bg-gray-900">
        {isCodeLesson && (
          <>
            {/* File tabs */}
            {hasMultipleFiles && (
              <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center text-sm shrink-0 overflow-x-auto">
                {visibleFiles.map((f, i) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFileIndex(i)}
                    className={`px-4 h-full flex items-center gap-2 border-r border-gray-700 text-xs whitespace-nowrap transition-colors ${
                      i === activeFileIndex
                        ? "bg-gray-900 text-white border-b-2 border-b-yellow-500 -mb-px"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${f.isReadonly ? "bg-gray-600" : "bg-yellow-500"}`} />
                    {f.name}
                    {f.isReadonly && <span className="text-gray-600 text-[10px]">read-only</span>}
                  </button>
                ))}
                <span className="ml-auto mr-3 text-xs text-gray-600">
                  {language.toUpperCase()} • {execCount > 0 && `${execCount} run${execCount > 1 ? "s" : ""}`}
                </span>
              </div>
            )}

            {/* Single file header */}
            {!hasMultipleFiles && (
              <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm text-gray-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2" />
                <span className="font-mono text-xs">{activeFile?.name || "main.py"}</span>
                <span className="ml-auto text-xs text-gray-600">
                  {language.toUpperCase()} • {execCount > 0 && `${execCount} run${execCount > 1 ? "s" : ""}`}
                </span>
              </div>
            )}

            <CodeEditor
              value={activeContent}
              onChange={(v) => setFileContents((prev) => ({ ...prev, [activeFileIndex]: v }))}
              language={language}
              onRun={handleRun}
              readOnly={activeFile?.isReadonly}
              className="flex-1"
            />

            {/* Run bar */}
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

              {showSolution && activeFile && (
                <div className="mt-3 bg-gray-800 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold text-sm mb-2">
                    Solution — {activeFile.name}:
                  </h4>
                  <pre className="text-green-300 font-mono text-sm overflow-auto max-h-48 whitespace-pre-wrap">
                    {activeFile.content}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {isCliLesson && (
          <>
            <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-3 text-sm text-gray-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2" />
              <span className="font-mono text-xs">Terminal</span>
              <span className="ml-auto text-xs text-gray-600">bash</span>
            </div>
            <WebTerminal lessonId={lesson.uuid} wsUrl={null} className="flex-1" readonly={false} />
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

        {/* Quiz-only: show answer summary on the right */}
        {isChoiceLesson && !isCodeLesson && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-5xl mb-4">
                {showCorrect
                  ? selectedAnswer === lesson.question?.correctAnswer
                    ? "🎉"
                    : "💡"
                  : "🤔"}
              </div>
              <p className="text-gray-400 text-sm">
                {showCorrect
                  ? selectedAnswer === lesson.question?.correctAnswer
                    ? "Correct! Well done."
                    : "Not quite — review the instructions and try again."
                  : "Select your answer on the left panel."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
