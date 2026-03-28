# Copilot Instructions

Use this file as the concise rule set for GitHub Copilot. For fuller guidance, see `AGENTS.md`.

## Workflow

- For non-trivial code tasks, start with `mcp__vexp__run_pipeline`.
- Use `mcp__vexp__get_skeleton` for single-file inspection when needed.
- Use `Context7` for current framework, API, and library guidance before coding.
- Prefer the smallest complete change that solves the task end to end.
- Mention what you verified and what you could not verify.

## Framework Detection

- Read `package.json` first.
- If `next` or `next.config.*` exists, use `Next.js mode`.
- If `vite` exists and `next` does not, use `Vite/SPA mode`.
- If `src-tauri` exists, apply `Tauri/Desktop` rules on top of the web mode.
- Do not import patterns from another framework unless the repo already uses them.

## Next.js Mode

- Default to App Router unless the repo clearly uses Pages Router.
- Prefer Server Components by default.
- Add `"use client"` only when interactivity, browser APIs, or client-only hooks are required.
- Prefer server-side data fetching and avoid client-side waterfalls.
- Use framework primitives such as `layout`, `page`, `loading`, `error`, Route Handlers, and Server Actions when appropriate.
- Keep client bundles lean and be careful about server/client boundaries and serialization.

## Vite/SPA Mode

- Treat the app as client-rendered unless the repo already has a backend/runtime layer for the feature.
- Prefer local component, hook, and service boundaries over server-oriented abstractions.

## Tauri/Desktop Rules

- Treat browser APIs and desktop APIs as separate capability layers.
- Guard desktop-only features such as filesystem or native dialogs.
- Keep shared UI usable in browser context unless the feature is explicitly desktop-only.

## UI And Component Rules

- Preserve the existing visual language; avoid generic template-like UI.
- Include loading, empty, error, disabled, and success states where relevant.
- Keep keyboard access, focus states, and labels intact.
- Prefer existing UI primitives and utilities before creating new ones.
- Keep changes surgical in already-large components.
- Do not add memoization or new dependencies by default.

## Data And Performance

- Parallelize independent async work.
- Start async work early and await it as late as correctness allows.
- Prefer derived state during render over effect-driven synchronization when possible.
- Avoid oversized client bundles, heavy barrel imports, and unnecessary client-only code.

## Verification

- Prefer the narrowest meaningful verification first.
- In `Next.js` repos, usually run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- In `Vite` repos, usually run `pnpm typecheck`, `pnpm lint`, and `pnpm build:vite` when present.
- For `Tauri`, verify the web layer first, then native integration only if affected.

## Constraints

- Prefer existing dependencies and patterns already in the repo.
- Do not introduce a new router, state library, form library, or styling approach without clear need.
- For review tasks, prioritize bugs, regressions, edge cases, and missing verification over summaries.


## vexp context tools <!-- vexp v1.2.30 -->

**MANDATORY: use `run_pipeline` — do NOT grep, glob, or read files manually.**
vexp returns pre-indexed, graph-ranked context in a single call.

### Workflow
1. `run_pipeline` with your task description — ALWAYS FIRST (replaces all other tools)
2. Make targeted changes based on the context returned
3. `run_pipeline` again only if you need more context

### Available MCP tools
- `run_pipeline` — **PRIMARY TOOL**. Runs capsule + impact + memory in 1 call.
  Auto-detects intent. Includes file content. Example: `run_pipeline({ "task": "fix auth bug" })`
- `get_context_capsule` — lightweight, for simple questions only
- `get_impact_graph` — impact analysis of a specific symbol
- `search_logic_flow` — execution paths between functions
- `get_skeleton` — compact file structure
- `index_status` — indexing status
- `get_session_context` — recall observations from sessions
- `search_memory` — cross-session search
- `save_observation` — persist insights (prefer run_pipeline's observation param)

### Agentic search
- Do NOT use built-in file search, grep, or codebase indexing — always call `run_pipeline` first
- If you spawn sub-agents or background tasks, pass them the context from `run_pipeline`
  rather than letting them search the codebase independently

### Smart Features
Intent auto-detection, hybrid ranking, session memory, auto-expanding budget.

### Multi-Repo
`run_pipeline` auto-queries all indexed repos. Use `repos: ["alias"]` to scope. Run `index_status` to see aliases.
<!-- /vexp -->