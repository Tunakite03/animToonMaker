# AI Frame Continuity Plan

## Objective

Replace the current independent frame generation flow with a continuity-based
pipeline so adjacent frames keep the same character, composition, and style
while only changing the intended motion.

## Current Findings

- `Quick Animation` currently creates prompts like `frame 1 of N` and sends
  one text-to-image request per frame. This does not give the model any visual
  continuity signal.
- `useFrameGenerator` generates frames sequentially, but it does not pass the
  previous frame image into the next request.
- `GenerateFrameParams` already includes `initImage` and `strength`, but the
  provider implementations are not wired to accept or use them yet.
- `pnpm typecheck` is currently failing in `src/services/generate-frame.ts`
  because the service call site and provider function signatures are out of
  sync.
- `negativePrompt` and `autoGenerate` exist in settings, but they are not
  connected to the actual generation pipeline.
- `keypoints` exist in the frame model, but they are not used anywhere in
  generation. They should be treated as a later motion-control phase, not as
  part of the MVP fix.

## Scope

### In Scope

- Restore a valid generation service contract.
- Add continuity-based frame generation using the previous frame as a visual
  reference.
- Introduce configurable motion strength for small vs large frame-to-frame
  changes.
- Add provider capability checks and explicit fallback behavior.
- Wire missing generation settings that already exist in the repo if they are
  still relevant.

### Out of Scope

- Full pose/keypoint-driven animation generation.
- Multi-character scene choreography.
- Automatic motion planning from natural language alone.
- Video generation or interpolation between raster frames.

## Implementation Plan

### Phase 0: Stabilize the Generation Contract

**Files**

- `src/services/generate-frame.ts`
- `src/hooks/use-frame-generator.ts`

**Tasks**

- Align the `generateFrame` service contract with each provider implementation.
- Decide a single internal request shape for all providers:
  - `prompt`
  - `negativePrompt?`
  - `initImage?`
  - `strength?`
  - `provider`
  - `model`
  - `width`
  - `height`
- Make `pnpm typecheck` pass before continuing.
- Add a provider capability table in code, for example:
  - `supportsReferenceImage`
  - `supportsNegativePrompt`
  - `supportsMotionStrength`

**Exit Criteria**

- No type errors in generation service code.
- Unsupported provider features are explicitly known instead of being silently
  ignored.

### Phase 1: Continuity-Based MVP Generation

**Files**

- `src/hooks/use-frame-generator.ts`
- `src/lib/image-assets.ts`
- `src-tauri/src/commands.rs`

**Tasks**

- In single-frame generation, determine whether a previous completed frame
  exists and can be used as a reference.
- In batch generation, use strict sequential execution:
  - Generate frame 1.
  - Save frame 1 result.
  - Use frame 1 output as the reference for frame 2.
  - Continue until the sequence ends or a frame fails.
- Convert the previous frame asset into a format accepted by providers:
  preferably a data URL or base64 image payload.
- Use the existing Tauri image read path if local asset URLs need conversion
  back into portable image data.
- Halt batch generation on continuity breakage instead of producing a broken
  downstream sequence.

**Exit Criteria**

- Generating a 6-frame sequence uses the output of frame N as visual input for
  frame N+1.
- A failed frame stops the remaining sequence and surfaces a clear error.

### Phase 2: Provider-First Reference Implementation

**Files**

- `src/services/generate-frame.ts`
- `src/components/frame-prompt-panel.tsx`
- `src/components/settings-dialog.tsx`
- `src/store/settings-store.ts`

**Tasks**

- Implement one provider as the first-class continuity path before expanding to
  the rest.
- Recommended first provider: Gemini image generation with text+image input.
- For providers without reference-image support:
  - fall back to text-to-image only, or
  - disable continuity mode in the UI with an explicit explanation.
- Add `motionStrength` to settings with a safe default such as `0.35` or
  `0.4`.
- Expose continuity mode in the UI so users understand when generation is:
  - independent
  - reference-based

**Exit Criteria**

- At least one provider can perform continuity-based generation end to end.
- Unsupported providers do not pretend to support the same behavior.

### Phase 3: Prompt and UX Refinement

**Files**

- `src/components/frame-prompt-panel.tsx`
- `src/store/settings-store.ts`
- `src/hooks/use-frame-generator.ts`

**Tasks**

- Stop relying on `frame i of N` as the primary motion instruction.
- Split prompt intent into:
  - subject and style lock
  - per-frame motion delta
  - optional global negative prompt
- Decide how `autoGenerate` should behave:
  - implement it for newly added frames, or
  - remove or hide it until it is real
- Wire `negativePrompt` into providers that support it.
- Add UX messaging for continuity limitations, cost, and expected latency.

**Exit Criteria**

- The UI clearly communicates how frame continuity works.
- Existing settings no longer exist as dead controls.

### Phase 4: Sequence Integrity Rules

**Files**

- `src/store/animation-store.ts`
- `src/hooks/use-frame-generator.ts`
- `src/components/frame-prompt-panel.tsx`

**Tasks**

- Define what happens when a middle frame is regenerated:
  - Option A: only regenerate that frame.
  - Option B: mark downstream frames as stale because continuity changed.
- Recommended behavior for MVP:
  - regenerate only the chosen frame
  - mark downstream frames as potentially stale when they were generated from
    that frame chain
- Add lightweight metadata if needed to track continuity dependencies between
  frames.

**Exit Criteria**

- Mid-sequence regeneration does not leave users guessing whether later frames
  are still valid.

### Phase 5: Advanced Motion Control

**Files**

- `src/types/animation.ts`
- `src/components/canvas-editor.tsx`
- generation service and provider adapters

**Tasks**

- Revisit `keypoints` as an advanced feature once continuity works.
- Use keypoints to guide pose, direction, or composition changes instead of
  forcing all motion through prompt text.
- Keep this phase separate from the continuity MVP to avoid blocking the core
  fix.

**Exit Criteria**

- Keypoints become an additive motion-control layer rather than a dependency for
  basic usable animation generation.

## Acceptance Criteria

- `pnpm typecheck` passes.
- A 6-frame test sequence such as `cat walking` keeps the same subject and
  visual identity across frames with visibly smaller drift than the current
  implementation.
- When the selected provider does not support continuity mode, the app shows an
  explicit limitation instead of silently degrading.
- Regenerating a frame does not silently misrepresent downstream continuity.
- `negativePrompt` and `autoGenerate` are either connected to real generation
  behavior or removed from the active UI.

## Risks

- Provider support is uneven; some APIs may support text-to-image but not
  image-to-image in the same endpoint.
- Reference-based generation increases cost and latency per sequence.
- Drift can still accumulate over long sequences even with reference images.
- Local Tauri asset URLs may need explicit conversion before they can be sent to
  remote APIs.
- Provider-specific payload differences can cause the shared service layer to
  become fragile if capability checks are not centralized.

## Verification Plan

1. `pnpm typecheck`
2. Targeted manual generation test with one continuity-capable provider
3. Manual fallback test with one non-capable provider
4. End-to-end batch generation test:
   - 4-frame sequence
   - 8-frame sequence
   - failure on frame 3
5. Manual regenerate-middle-frame test

## Open Questions

- Which provider should be treated as the continuity MVP path: Gemini, OpenAI,
  Stability, or another one?
- Should failed batch generation stop immediately or offer a continue-without-
  continuity option later?
- Do downstream frames need explicit stale markers after a parent frame changes?
- Do we want one prompt per frame, or a sequence-level prompt plus per-frame
  motion notes?
