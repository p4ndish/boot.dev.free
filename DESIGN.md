---
version: alpha
name: Boot.dev Clone Dark
description: A dark-themed interactive coding education platform with warm yellow accents.
colors:
  primary: "#030712"
  secondary: "#111827"
  tertiary: "#1f2937"
  border: "#374151"
  accent: "#eab308"
  accent-hover: "#facc15"
  on-primary: "#f3f4f6"
  on-secondary: "#9ca3af"
  on-tertiary: "#4b5563"
  on-accent: "#030712"
  success: "#16a34a"
  success-hover: "#22c55e"
  error: "#ef4444"
  code-bg: "#0d1117"
typography:
  heading-xl:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 3rem
    fontWeight: 700
  heading-lg:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 2rem
    fontWeight: 700
  heading-md:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 1.25rem
    fontWeight: 600
  body-md:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.875rem
  body-sm:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.75rem
  code:
    fontFamily: JetBrains Mono, Fira Code, Cascadia Code, monospace
    fontSize: 0.8125rem
  label:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.75rem
    fontWeight: 600
rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-run:
    backgroundColor: "{colors.success}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  button-run-hover:
    backgroundColor: "{colors.success-hover}"
    textColor: "#ffffff"
  button-submit:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  button-submit-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.border}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 12px 24px
  card:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
    textColor: "{colors.on-primary}"
  badge:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 2px 8px
  answer-btn:
    backgroundColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: 12px 16px
    textColor: "{colors.on-primary}"
  answer-correct:
    backgroundColor: "{colors.success}"
    textColor: "#ffffff"
  nav-link:
    textColor: "{colors.on-secondary}"
  nav-link-active:
    textColor: "{colors.on-primary}"
  code-block:
    backgroundColor: "{colors.code-bg}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

## Overview

A dark, code-focused design system for an interactive coding education platform.
The aesthetic is functional — think "dark IDE" with warm yellow accents. No gamification fluff.

## Colors

- **Primary (#030712):** Page/editor background. Deep near-black.
- **Secondary (#111827):** Cards, navbar, panels.
- **Tertiary (#1F2937):** Editor headers, hover states.
- **Border (#374151):** Panel dividers, card borders.
- **Accent (#EAB308):** Sole CTA color — buttons, links, active states.
- **Success (#16A34A):** Run button, positive feedback.
- **Error (#EF4444):** Test failures, destructive actions.
- **Code-bg (#0D1117):** Editor surface, slightly warmer than primary.

## Typography

System-ui for UI, JetBrains Mono stack for code. Headings use yellow accent (text-yellow-300),
body uses on-primary (gray-100), secondary text uses on-secondary (gray-400).

## Layout

Navbar: 56px sticky. Lessons: two-panel split (w-1/2 with border). Content: max-w-4xl centered.
Consistent spacing scale: xs(4), sm(8), md(16), lg(24), xl(32).

## Components

- **button-run:** Green bg, white text, rounded-lg. "▶ Run".
- **button-submit:** Yellow bg, dark text, rounded-lg. "Submit →".
- **card:** Dark surface, border, lg rounded. Hover adds subtle yellow border.
- **code-block:** Dark snippet, sm rounded, mono font.
- **answer-btn:** Full-width choice. Correct→green, incorrect→red.

## Do's and Don'ts

✅ Use accent only for actions — never decoration.
✅ Keep spacing consistent (xs/sm/md/lg/xl).
❌ No shadows or gradients (flat depth model).
❌ No gamification UI (XP bars, streaks, leaderboards).
