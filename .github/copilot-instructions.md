# AnimToon Maker — Project Guidelines

> AI-powered frame-by-frame animation editor. Users write prompts per frame, AI generates images, frames play back as smooth animation, and the result exports as GIF/WebM.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.x |
| Language | TypeScript (strict mode) | 5.x |
| UI | React | 19.x |
| Styling | Tailwind CSS v4 + tw-animate-css | 4.x |
| Components | shadcn/ui (Radix primitives) | latest |
| Icons | HugeIcons (react + core-free-icons) | latest |
| State | Zustand (persist middleware) | 5.x |
| DnD | @dnd-kit (core + sortable) | latest |
| Export | gif.js (Web Worker) | 0.2.x |
| IDs | nanoid | 5.x |
| Package Manager | pnpm | latest |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/generate-frame/ # POST — AI image generation endpoint
│   ├── settings/           # Settings pages (ai-provider, canvas, editor, export, generation)
│   ├── layout.tsx          # Root layout with ThemeProvider
│   └── page.tsx            # Main editor page
├── components/             # Reusable UI components
│   ├── ui/                 # shadcn/ui primitives (button, dialog, input, etc.)
│   ├── animation-player.tsx    # Canvas-based frame playback
│   ├── animation-timeline.tsx  # Horizontal frame strip with DnD
│   ├── editor-layout.tsx       # Main editor shell
│   ├── export-panel.tsx        # GIF/WebM export UI
│   ├── frame-prompt-panel.tsx  # Per-frame prompt editing
│   └── toolbar.tsx             # Playback controls
├── hooks/                  # Custom React hooks
│   ├── use-frame-generator.ts  # AI generation with abort support
│   └── use-playback.ts         # requestAnimationFrame-based playback
├── lib/                    # Shared utilities & constants
│   ├── constants.ts        # FPS, dimensions, style suffix, limits
│   └── utils.ts            # cn() helper (clsx + tailwind-merge)
├── store/                  # Zustand stores
│   ├── animation-store.ts  # Frames, project state, playback
│   └── settings-store.ts   # AI provider, canvas, export settings (persisted)
├── types/
│   └── animation.ts        # Frame, AnimationProject, PlaybackState types
public/
└── gif.worker.js           # gif.js Web Worker
```

## Code Style & Conventions

- **TypeScript strict mode** — always enabled; never use `any` unless truly unavoidable
- **Naming**: `kebab-case` files, `PascalCase` components/types, `camelCase` functions/variables, `UPPER_SNAKE_CASE` constants
- **Imports**: use `@/*` path alias (maps to `src/`); prefer named exports for utilities, default exports for page/layout components
- **Components**: use `"use client"` directive only when hooks, state, or browser APIs are needed — default to Server Components
- **Semicolons**: always use them
- **Formatting**: Prettier + prettier-plugin-tailwindcss for class sorting
- **Linting**: ESLint with eslint-config-next

## Architecture Rules

### Server vs Client Boundary
- API routes (`src/app/api/`) handle all external API calls — **never call AI providers from the browser**
- API keys resolve in priority: request body (from settings UI) → `.env.local` → placeholder mode
- Client components read settings from Zustand and pass them via POST body

### State Management (Zustand)
- `animation-store.ts` — project state, frames CRUD, playback (no persistence)
- `settings-store.ts` — user preferences with `persist` middleware (localStorage)
- Access store outside React with `useStore.getState()` only in hooks/callbacks, never in render

### AI Generation Pipeline
1. User writes prompt → client calls `POST /api/generate-frame`
2. Server appends `STYLE_SUFFIX` for visual consistency
3. Server routes to fal.ai / Replicate / OpenAI based on resolved provider
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
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier format
pnpm typecheck    # tsc --noEmit
pnpm check        # lint + typecheck + build (CI)
```

## Environment Variables

```bash
# .env.local (never commit)
FAL_KEY=           # fal.ai API key
REPLICATE_API_TOKEN=  # Replicate API token
OPENAI_API_KEY=    # OpenAI API key
```

## Critical Constraints

- **Max 120 frames** per project (`MAX_FRAMES` in constants)
- **Default canvas**: 512×512px, 12 FPS
- **Prompt limit**: 1000 characters (sanitized server-side)
- **Frame duration** auto-recalculates when FPS changes
- **AbortController** per frame generation — always support cancellation
- **Onion skin** feature for animation continuity (opacity configurable)

## When Modifying This Project

1. Check `src/types/animation.ts` for data shapes before changing stores or components
2. Keep AI provider logic server-side only — never import API SDKs in client bundles
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