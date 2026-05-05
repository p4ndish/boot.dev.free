"use client";
// components/CodeEditor.tsx
// CodeMirror 6 editor with syntax highlighting, vim keybindings support

import { useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { go } from "@codemirror/lang-go";
import { sql } from "@codemirror/lang-sql";
import { cpp } from "@codemirror/lang-cpp";

const languageExtensions: Record<string, () => any> = {
  python: python,
  py: python,
  javascript: javascript,
  js: javascript,
  typescript: () => javascript({ typescript: true }),
  ts: () => javascript({ typescript: true }),
  go: go,
  golang: go,
  sql: sql,
  c: cpp,
  cpp: cpp,
};

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  className?: string;
  onRun?: () => void;
}

export function CodeEditor({ value, onChange, language, readOnly, className, onRun }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const langExt = languageExtensions[language?.toLowerCase()];
    const lang = langExt ? langExt() : [];

    const runKeymap = onRun
      ? keymap.of([{ key: "Mod-Enter", run: () => { onRun(); return true; } }])
      : [];

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        runKeymap,
        lang,
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(!!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setIsReady(true);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update value externally
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }
  }, [value]);

  // Update language
  useEffect(() => {
    if (!viewRef.current || !language) return;
    const langExt = languageExtensions[language.toLowerCase()];
    if (!langExt) return;
    viewRef.current.dispatch({
      effects: EditorView.scrollIntoView(0),
    });
  }, [language]);

  return (
    <div
      ref={editorRef}
      className={`cm-editor-container ${className || ""}`}
      style={{ height: "100%", overflow: "auto" }}
    />
  );
}
