# Repository Agent Rules

## Default Codebase Read Path

For every user request that touches this repository's code, architecture, debugging, refactoring, implementation, review, or file-level behavior, start by using `vexp` before using slower ad hoc inspection.

Required default order:
1. Call `mcp__vexp__run_pipeline` first for any non-trivial repository task.
2. If only a single file needs quick inspection, use `mcp__vexp__get_skeleton` instead of broad file reads.
3. For tasks involving external libraries, frameworks, APIs, platform features, or implementation patterns that may have changed, use `Context7` to fetch current official documentation before coding.
4. Use shell/file reads only after `vexp` if exact raw lines, command output, or verification is still needed.

Exceptions:
- Skip `vexp` only for requests that are clearly unrelated to the codebase, such as casual conversation, pure translation, or simple environment checks.
- Skip `Context7` only when the task is purely local to this repository and does not depend on external library or platform behavior.
- If `vexp` is unavailable or fails, state that briefly and fall back to direct repository inspection.
- If `Context7` is unavailable or does not have good coverage for the relevant dependency, state that briefly and fall back to the best available primary source.

Behavioral requirement:
- Optimize for fastest repository understanding path. Prefer `vexp` over manual search, broad recursive reads, or piecemeal file exploration.
- Optimize for up-to-date implementation guidance. Prefer `Context7` over memory for framework and library usage when correctness depends on current docs.
- Default combined workflow for technical work: `vexp` to understand local code, `Context7` to confirm current external API guidance, then implement.


## Project Profile

Treat this file as reusable for modern web/app repositories, not just this codebase.

Framework detection order:
1. Read `package.json`.
2. Check for framework-specific config such as `next.config.*`, `vite.config.*`, `astro.config.*`, or desktop wrappers like `src-tauri`.
3. Apply the matching mode below before making implementation decisions.

Mode detection rules:
- `next` dependency or `next.config.*` present: use `Next.js mode`
- `vite` dependency and no `next`: use `Vite/SPA mode`
- `src-tauri` present: add `Tauri/Desktop overlay` rules on top of the web mode
- If the repo is mixed or migrating, prefer the mode that matches the edited area instead of forcing one global assumption

Baseline assumptions for all web/app repos:
- Prefer existing local patterns before introducing new architecture.
- Keep the app usable with solid loading, error, empty, and disabled states.
- Use the framework already present in the repo rather than importing conventions from another stack.


## Framework Modes

### Next.js Mode

When the repo is a `Next.js` app:
- Default to App Router conventions unless the repo clearly uses Pages Router.
- Prefer Server Components by default; add `"use client"` only where interactivity, browser APIs, or client-only hooks are required.
- Fetch data on the server first when possible; avoid unnecessary client-side waterfalls.
- Use Route Handlers, Server Actions, and framework-native primitives before inventing custom API layers.
- Be deliberate about caching, revalidation, and dynamic rendering behavior.
- Keep client bundles lean: avoid pushing large data or heavy libraries into client components without reason.
- Use `next/dynamic` or code splitting for clearly heavy client-only UI.
- Preserve framework files and conventions such as `layout`, `page`, `loading`, `error`, `not-found`, and metadata boundaries when relevant.

### Vite/SPA Mode

When the repo is a browser SPA or `Vite` app:
- Treat the app as a client-rendered interface unless the repo already has a backend or desktop runtime layer for the feature.
- Prefer local component/hook/service boundaries over introducing server-oriented abstractions from `Next.js`.
- Use browser APIs carefully and guard edge cases that would normally be handled server-side in other frameworks.

### Tauri/Desktop Overlay

When the repo includes `Tauri` or another desktop shell:
- Treat browser APIs and desktop APIs as separate capability layers.
- Keep shared UI code usable in a browser-rendered context unless the task is explicitly desktop-only.
- If a feature depends on filesystem, native dialogs, or OS integration, explicitly guard it and make the fallback state understandable.
- Do not spread desktop-only assumptions across generic UI components without checking runtime boundaries.


## Default Web/App Workflow

For feature work, UI changes, bug fixes, or refactors related to product behavior:
1. Start with `mcp__vexp__run_pipeline`.
2. Read `package.json` and the most relevant local files only after `vexp` narrows the scope.
3. Use `Context7` for current guidance when touching `React`, `Tauri`, `Tailwind`, `shadcn`, browser APIs, or build-tool behavior.
4. Implement the smallest coherent change that solves the task end to end.
5. Verify with the narrowest meaningful command first, then broader checks if the change surface is wider.

Preferred verification order:
- `pnpm typecheck` for typing-sensitive edits
- `pnpm lint` for lint-sensitive edits
- `pnpm build:vite` for UI/build integration changes
- `pnpm check` for broader confidence when the change spans multiple areas


## UI Quality Bar

When building or editing screens, panels, dialogs, or flows:
- Preserve the existing product feel; avoid generic template-like UI.
- Favor clear visual hierarchy, deliberate spacing, and strong labeling over decorative noise.
- Include real loading, empty, error, disabled, and success states where the interaction needs them.
- Keep keyboard access, focus visibility, and screen-reader labels intact.
- Prefer composition with existing UI primitives in `src/components/ui` before inventing new ones.
- Reuse `cn`, variant patterns, and shared styling utilities instead of duplicating class logic.
- Keep desktop usability high while avoiding layouts that break on smaller widths.
- When the repo uses `shadcn`, prefer extending existing primitives and variants instead of bypassing the design system.


## Component And State Rules

- Prefer focused components and hooks over growing already-large files unless the task is truly local.
- Keep rendering concerns in components and move side effects or transformation logic into helpers/hooks/services when that improves clarity.
- Avoid unnecessary prop drilling if the repo already has a store, context, or existing state boundary that fits.
- Do not add memoization by default; add it only when there is a demonstrated render-cost reason or an existing pattern nearby.
- When editing a large panel/editor component, keep changes surgically scoped and avoid opportunistic rewrites.
- In `Next.js` repos, do not move server-safe logic into client components without a concrete reason.
- In `Next.js` repos, be careful about what crosses the server/client boundary and what gets serialized to the client.


## Data Fetching And Performance

- Avoid fetch waterfalls when requests are independent; parallelize them.
- Start asynchronous work early and await it as late as correctness allows.
- Prefer derived state during render over effect-driven synchronization when possible.
- Avoid moving cheap expressions into memoization without evidence.
- Be cautious with barrel imports and oversized client bundles in React/Next.js repos.
- Defer heavy or non-critical code until the user path actually needs it.


## Verification By Stack

- For `Next.js`: prefer `pnpm lint`, `pnpm typecheck`, `pnpm build`, and any targeted route/component verification relevant to the changed surface.
- For `Vite`: prefer `pnpm typecheck`, `pnpm lint`, and `pnpm build:vite` when present.
- For desktop wrappers like `Tauri`: verify the web layer first, then desktop integration only if the edited feature touches native behavior.


## Dependency And Pattern Discipline

- Prefer existing dependencies already in the repo before adding new packages.
- Use `shadcn` CLI or existing component patterns when extending the design system, instead of hand-rolling inconsistent primitives.
- Keep Tailwind utility usage readable; extract repeated styling patterns when duplication becomes structural.
- Do not introduce a new state library, router pattern, form library, or styling approach without explicit need.
- Do not copy `Next.js` patterns into non-Next repos or SPA-only patterns into `Next.js` repos without checking the architectural fit.


## Delivery Expectations

- For implementation tasks, finish the change instead of stopping at analysis when the path is clear.
- State important assumptions if the code or product behavior leaves real ambiguity.
- Mention verification actually performed, and call out anything you could not verify.
- If a request is better handled as review, prioritize bugs, regressions, edge cases, and missing verification over summaries.
- When reusing this file in another repo, update only the stack-specific examples and commands; keep the workflow and quality bar intact unless the project has a strong reason to differ.


## vexp <!-- vexp v1.2.30 -->

**MANDATORY: use `run_pipeline` — do NOT grep or glob the codebase.**
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
