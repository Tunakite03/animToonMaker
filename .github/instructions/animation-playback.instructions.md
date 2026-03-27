---
description: "Use when working on animation playback, Canvas rendering, frame timing, export pipeline, or the animation player/timeline. Covers performance-critical patterns for smooth animation."
---

# Animation & Playback Guidelines

## Playback Engine (`use-playback.ts`)
- Use `requestAnimationFrame` — never `setInterval` or `setTimeout` for frame advancement
- Accumulate elapsed time and advance frame when `elapsed >= frame.duration`
- Pre-load ALL frame images (`new Image()` + `onload`) before starting playback
- Do not start playback if any frame has `imageUrl === null`

## Canvas Rendering (`animation-player.tsx`)
- Render frames to `<canvas>` using `drawImage` — never swap DOM elements for frame display
- Clear canvas before each frame draw
- Match canvas dimensions to project `width` × `height`
- Use `willReadFrequently: false` on 2D context for GPU optimization

## Onion Skin
- Draw previous frame at `onionSkinOpacity` before current frame
- Only show onion skin when NOT playing (editing mode)
- Opacity is configurable via `settings-store.ts`

## Timeline (`animation-timeline.tsx`)
- Horizontal scrollable strip with frame thumbnails
- Drag-and-drop reordering via `@dnd-kit/sortable`
- Show frame status indicator (idle/generating/done/error)
- Respect `MAX_FRAMES` (120) — disable "add frame" when limit reached

## Export Pipeline (`export-panel.tsx`)
- GIF: `gif.js` with Web Worker at `public/gif.worker.js`
- Draw frames to offscreen canvas at `exportScale` × project dimensions
- Set `gif.js` quality and delay per frame from `frame.duration`
- Show progress bar during export
- WebM: planned — not yet implemented

## Performance Rules
- Never block the main thread during export — use Web Workers
- Avoid re-creating Image objects on every render — cache loaded images
- Use `useCallback`/`useMemo` only when profiling shows a real need
