# AnimToon Maker — Project Guidelines

> AI-powered frame-by-frame animation editor (desktop app). Users write prompts per frame, AI generates images, frames play back as smooth animation, and the result exports as GIF/WebM.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop Shell | Tauri v2 (Rust backend, WebView2) | 2.x |
| Bundler | Vite | 6.x |
| Language | TypeScript (strict mode) | 5.x |
| UI | React | 19.x |
| Routing | React Router (HashRouter) | 7.x |
| Styling | Tailwind CSS v4 + tw-animate-css | 4.x |
| Components | shadcn/ui (Radix primitives) | latest |
| Icons | Lucice react icons | latest |
| State | Zustand (persist middleware) | 5.x |
| DnD | @dnd-kit (core + sortable) | latest |
| HTTP | @tauri-apps/plugin-http (CORS-free) | 2.x |
| Export | gif.js (Web Worker) | 0.2.x |
| IDs | nanoid | 5.x |
| Package Manager | pnpm | latest |

## Project Structure

```
index.html                  # Vite entry point (Google Fonts, root div)
vite.config.ts              # Vite config with Tauri dev settings
src/
├── main.tsx                # React root — HashRouter + App
├── App.tsx                 # React Router routes definition
├── app/
│   ├── globals.css         # Tailwind v4 + shadcn theme
│   └── settings/           # Settings pages (ai-provider, canvas, editor, export, generation)
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui primitives (button, dialog, input, etc.)
│   ├── animation-player.tsx    # Canvas-based frame playback
│   ├── animation-timeline.tsx  # Horizontal frame strip with DnD
│   ├── editor-layout.tsx       # Main editor shell
│   ├── export-panel.tsx        # GIF/WebM export UI
│   ├── frame-prompt-panel.tsx  # Per-frame prompt editing
│   ├── theme-provider.tsx      # Custom theme provider (light/dark/system)
│   └── toolbar.tsx             # Playback controls
├── hooks/                  # Custom React hooks
│   ├── use-frame-generator.ts  # AI generation with abort support
│   └── use-playback.ts         # requestAnimationFrame-based playback
├── lib/                    # Shared utilities & constants
│   ├── constants.ts        # FPS, dimensions, style suffix, limits
│   └── utils.ts            # cn() helper (clsx + tailwind-merge)
├── services/
│   └── generate-frame.ts   # AI provider API calls (via Tauri HTTP plugin)
├── store/                  # Zustand stores
│   ├── animation-store.ts  # Frames, project state, playback
│   ├── project-library-store.ts  # Saved projects (persisted)
│   └── settings-store.ts   # AI provider, canvas, export settings (persisted)
├── types/
│   └── animation.ts        # Frame, AnimationProject, PlaybackState types
src-tauri/
├── Cargo.toml              # Rust dependencies (tauri, tauri-plugin-http)
├── tauri.conf.json         # Tauri window config, CSP, build commands
├── capabilities/
│   └── default.json        # HTTP permissions for AI provider URLs
├── src/
│   ├── main.rs             # Tauri entry point
│   └── lib.rs              # Plugin registration (opener, http)
public/
└── gif.worker.js           # gif.js Web Worker
```

## Code Style & Conventions

- **TypeScript strict mode** — always enabled; never use `any` unless truly unavoidable
- **Naming**: `kebab-case` files, `PascalCase` components/types, `camelCase` functions/variables, `UPPER_SNAKE_CASE` constants
- **Imports**: use `@/*` path alias (maps to `src/`); prefer named exports for utilities, default exports for page/layout components
- **Components**: all components are client-side (no Server Components in Tauri/Vite)
- **Semicolons**: always use them
- **Formatting**: Prettier + prettier-plugin-tailwindcss for class sorting
- **Linting**: ESLint with typescript-eslint

## Architecture Rules

### Server vs Client Boundary
- API calls go directly from the WebView using Tauri HTTP plugin — **no server-side API routes**
- API keys are stored in Zustand settings store (persisted to localStorage)
- AI provider logic lives in `src/services/generate-frame.ts`
- Tauri CSP and HTTP capabilities restrict which external URLs can be accessed

### State Management (Zustand)
- `animation-store.ts` — project state, frames CRUD, playback (no persistence)
- `settings-store.ts` — user preferences with `persist` middleware (localStorage)
- Access store outside React with `useStore.getState()` only in hooks/callbacks, never in render

### AI Generation Pipeline (Client-Side via Tauri HTTP)
- AI API calls happen client-side using `@tauri-apps/plugin-http` (CORS-free native fetch)
- `src/services/generate-frame.ts` handles all provider routing
- API keys are stored in Zustand settings store (localStorage)
- `use-frame-generator` hook imports the service directly (no API route)
1. User writes prompt → hook calls `generateFrame()` service
2. Service appends `STYLE_SUFFIX` for visual consistency
3. Service routes to fal.ai / Replicate / OpenAI / Stability / Together / Gemini
4. Returns `{ imageUrl }` or falls back to SVG placeholder
5. Frame status: `idle` → `generating` → `done` | `error`
6. Batch generation is sequential to avoid rate limits

### Animation Playback
- Use `requestAnimationFrame` for smooth, stutter-free playback
- Pre-load all frame images before playing
- Respect per-frame `duration` (derived from FPS)
- Canvas rendering for performance — no DOM-based frame switching

### Export Pipeline
- GIF export via `gif.js` using Web Worker (`public/gif.worker.js`)
- Draw frames to offscreen canvas at export scale, then encode

## Build & Development

```bash
pnpm dev          # Start Tauri dev (Vite + native window)
pnpm dev:vite     # Start Vite dev server only (browser)
pnpm build        # Build Tauri app (production binary)
pnpm build:vite   # Build frontend only
pnpm lint         # ESLint
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier format
pnpm typecheck    # tsc --noEmit
pnpm check        # lint + typecheck + build (CI)
```

## Environment Variables

API keys are configured in the Settings UI and stored in localStorage (Zustand persist).
No `.env` files are needed for AI provider keys.

## Critical Constraints

- **Max 120 frames** per project (`MAX_FRAMES` in constants)
- **Default canvas**: 512×512px, 12 FPS
- **Prompt limit**: 1000 characters (sanitized client-side)
- **Frame duration** auto-recalculates when FPS changes
- **AbortController** per frame generation — always support cancellation
- **Onion skin** feature for animation continuity (opacity configurable)

## When Modifying This Project

1. Check `src/types/animation.ts` for data shapes before changing stores or components
2. Keep AI provider logic in `src/services/generate-frame.ts` — use Tauri HTTP plugin for CORS-free requests
3. Preserve the `STYLE_SUFFIX` pattern for visual frame consistency
4. Test playback smoothness after any change to animation-player or use-playback
5. Run `pnpm check` before considering any change complete

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
