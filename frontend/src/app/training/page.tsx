"use client";
// app/training/page.tsx — Training Grounds: Challenge search & practice

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { CodeEditor } from "@/components/CodeEditor";
import { useCodeExecution } from "@/hooks/useCodeExecution";

interface Challenge {
  id: string;
  uuid: string;
  title: string;
  language: string;
  topics: string[];
  difficulty: number;
  courseTitle: string;
  type: string;
  readme?: string;
  starterFiles?: { name: string; content: string }[];
}

const LANGUAGES = ["all", "py", "go", "js", "ts", "sql", "c"];
const TOPICS = [
  "all",
  "print()",
  "variables",
  "functions",
  "loops",
  "conditionals",
  "lists",
  "slices",
  "structs",
  "interfaces",
  "concurrency",
  "errors",
  "testing",
  "debugging",
  "sql",
  "select",
  "join",
];

export default function TrainingPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("all");
  const [topic, setTopic] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const { output, isRunning, runCode, clearOutput } = useCodeExecution();

  // Fetch challenges
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (language !== "all") params.set("language", language);
    if (topic !== "all") params.set("topic", topic);
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/v1/challenges?${params}`);
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (e) {
      console.error("Failed to fetch challenges", e);
    }
    setLoading(false);
  }, [language, topic]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const filteredChallenges = challenges.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.topics?.some((t) => t.toLowerCase().includes(q)) ||
      c.courseTitle?.toLowerCase().includes(q)
    );
  });

  const handleSelectChallenge = async (challenge: Challenge) => {
    if (challenge.readme || challenge.starterFiles) {
      setSelectedChallenge(challenge);
      setCode(challenge.starterFiles?.[0]?.content || "");
      clearOutput();
      return;
    }

    // Fetch full challenge data
    try {
      const res = await fetch(`/api/v1/challenges/${challenge.uuid || challenge.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedChallenge(data);
        setCode(data.starterFiles?.[0]?.content || "");
        clearOutput();
      }
    } catch (e) {
      console.error("Failed to load challenge", e);
    }
  };

  const handleRun = async () => {
    clearOutput();
    await runCode(code, selectedChallenge?.language || "python");
  };

  const difficultyStars = (d: number) => {
    const filled = Math.min(5, Math.max(1, Math.ceil(d / 2)));
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {!selectedChallenge ? (
        <>
          {/* Browse */}
          <div className="px-6 py-6 max-w-5xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-2">Training Grounds</h1>
            <p className="text-gray-400 mb-6">Practice coding challenges by language and topic.</p>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    language === l
                      ? "bg-yellow-500 text-gray-950 font-semibold"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {l === "all" ? "All" : l.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {TOPICS.slice(0, 12).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    topic === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {t === "all" ? "All Topics" : t}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges..."
              className="w-full mb-6 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
            />

            {/* Challenge grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredChallenges.map((c) => (
                  <button
                    key={c.uuid || c.id}
                    onClick={() => handleSelectChallenge(c)}
                    className="text-left bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/30 transition-all hover:shadow-lg hover:shadow-yellow-500/5"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{c.title}</h3>
                      <span className="shrink-0 text-xs bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-500">
                        {(c.language || "py").toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-yellow-600 mb-2">
                      {difficultyStars(c.difficulty || 2)}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(c.topics || []).slice(0, 3).map((t) => (
                        <span key={t} className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{c.courseTitle}</div>
                  </button>
                ))}
              </div>
            )}

            {!loading && filteredChallenges.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <div className="text-4xl mb-4">🔍</div>
                <p>No challenges found. Try changing filters.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Challenge view */}
          <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 shrink-0">
            <button
              onClick={() => setSelectedChallenge(null)}
              className="text-gray-400 hover:text-white text-sm mr-4"
            >
              ← Back to Training
            </button>
            <span className="text-sm text-gray-500 truncate">{selectedChallenge.title}</span>
            <span className="ml-auto text-xs text-gray-600 font-mono">
              {(selectedChallenge.language || "py").toUpperCase()} •{" "}
              {difficultyStars(selectedChallenge.difficulty || 2)}
            </span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Instructions */}
            <div className="w-1/2 overflow-y-auto border-r border-gray-800 p-6">
              <h1 className="text-xl font-bold mb-4 text-yellow-300">{selectedChallenge.title}</h1>
              {selectedChallenge.readme ? (
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">
                  {selectedChallenge.readme.substring(0, 3000)}
                </div>
              ) : (
                <p className="text-gray-400">Practice this coding challenge. Write your solution and run to test it.</p>
              )}
              {selectedChallenge.topics && selectedChallenge.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedChallenge.topics.map((t) => (
                    <span key={t} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Editor */}
            <div className="w-1/2 flex flex-col bg-gray-900">
              <div className="h-9 bg-gray-800 border-b border-gray-700 flex items-center px-4 text-sm text-gray-400 shrink-0">
                <span className="font-mono text-xs">solution.{(selectedChallenge.language || "py")}</span>
              </div>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={selectedChallenge.language || "python"}
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
                  </button>
                </div>
                {output && (
                  <pre className="bg-gray-950 text-gray-300 p-4 rounded-lg font-mono text-sm overflow-auto max-h-48 border border-gray-800 whitespace-pre-wrap">
                    {output}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
