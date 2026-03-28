---
description: "Use when writing or modifying React components, TSX/JSX files, or framework UI code. Detect whether the repo is Next.js or Vite/SPA before applying framework-specific rules."
applyTo: "**/*.tsx, **/*.jsx"
---

# Next.js 16 + React 19 Conventions

## Framework Detection
- Read `package.json` and nearby config first.
- If the repo has `next` or `next.config.*`, use `Next.js mode`.
- If the repo has `vite` and not `next`, use `Vite/SPA mode`.
- Do not force `Next.js` conventions into non-Next repos.

## Next.js Mode
- Default to Server Components unless the file clearly needs client interactivity.
- Add `"use client"` only when hooks, event handlers, browser APIs, or client-only libraries are required.
- Do not call your own Route Handlers from Server Components just to reach app logic; extract shared logic into modules.
- Keep server/client boundaries explicit and be careful about what is serialized to the client.
- Prefer framework primitives such as `layout`, `page`, `loading`, `error`, Route Handlers, and Server Actions when they fit the task.
- Keep client bundles lean; use `next/dynamic` only for clearly heavy client-only UI.

## Vite/SPA Mode
- Treat the UI as client-rendered unless the repo already has another runtime boundary.
- Prefer local component, hook, and service boundaries over server-oriented abstractions.
- Use browser APIs carefully and avoid copying App Router patterns into SPA code without a real need.

## React 19 Patterns
- Prefer focused components and hooks over expanding already-large files.
- Do not add memoization by default; add it only when there is an actual render-cost reason.
- Prefer derived state during render over effect-driven synchronization when possible.
- Keep async work parallel where requests are independent.

## Component Guidelines
- One component per file; match filename to export name
- Use TypeScript interfaces for props — never `any`
- Prefer composition over prop drilling — use children/slots patterns
- Place shared components in shared UI folders, route-specific ones near the route when the repo already follows that pattern
- Prefer existing UI primitives and utilities before creating new ones
