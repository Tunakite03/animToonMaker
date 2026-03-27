---
description: "Use when working with Zustand stores, state management, or persisted settings. Covers store patterns, selectors, and state mutation conventions."
applyTo: "src/store/**"
---

# Zustand Store Conventions

## Store Architecture
- `animation-store.ts` — project state + frames CRUD + playback (NO persistence)
- `settings-store.ts` — user preferences with `persist` middleware → localStorage

## Mutation Rules
- Use Zustand's `set` with callback: `set((s) => ({ ... }))` for derived state
- Keep mutations atomic — one `set` call per logical operation
- When updating frames array, always return a new array (immutable updates)
- When FPS changes, recalculate `duration` for ALL frames: `Math.round(1000 / fps)`

## Selector Patterns
- In React render: **always use selectors** → `useAnimationStore(s => s.project.fps)`
- NEVER call `useStore()` without a selector (causes re-render on every state change)
- Outside React (hooks/callbacks): use `useStore.getState()` — but NEVER in render

## Frame State Machine
```
idle → generating → done
idle → generating → error
```
- Always set `errorMessage: undefined` when starting generation
- Always clean up AbortController on cancel or completion

## Adding New State
1. Add the field to the interface
2. Add the initial value in the store creator
3. Add the setter action
4. If persisted, verify it's in `settings-store.ts` with `persist` middleware
5. Update `src/types/animation.ts` if the field belongs to a shared type
