# AnimToon Maker

AnimToon Maker is a desktop animation editor built with **Tauri v2 + React 19 + Vite 6**.
Users generate frame-by-frame images with AI prompts, arrange frames on a timeline, preview playback on canvas, and export GIF output.

## Tech Stack

- Tauri v2 (`src-tauri/`)
- React 19 + React Router 7 (`src/`)
- Vite 6 + TypeScript 5 strict
- Tailwind CSS v4 + shadcn/ui
- Zustand 5 for app state

## Development

```bash
pnpm install
pnpm dev        # Tauri desktop dev
pnpm dev:vite   # Web-only Vite dev server
```

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm check
pnpm rules:validate
```

## Rule System

Rule packs live under `.agents/skills/*/rules`.

- `pnpm rules:normalize` → normalize rule metadata
- `pnpm rules:index` → rebuild `.agents/rules-index.json`
- `pnpm rules:reindex:vexp` → refresh `.vexp/manifest.json`
- `pnpm rules:sync` → run all 3 in order
