import { create } from "zustand"
import { nanoid } from "nanoid"
import type {
  Frame,
  Animation,
  AnimationProject,
  PlaybackState,
  SavedProject,
  LegacySavedProject,
} from "@/types/animation"
import {
  DEFAULT_FPS,
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
} from "@/lib/constants"
import {
  getCachedImageAssetUrl,
  resolveImageAssetUrl,
  saveImageSourceAsAsset,
} from "@/lib/image-assets"

type FrameInsertPosition = "before" | "after"

interface FrameClipboard {
  frame: Frame
  mode: "copy" | "cut"
}

interface FrameActionNotice {
  id: string
  message: string
}

interface AnimationStore {
  project: AnimationProject
  playback: PlaybackState
  frameClipboard: FrameClipboard | null
  frameActionNotice: FrameActionNotice | null

  // Project actions
  setProjectName: (name: string) => void
  setFps: (fps: number) => void

  // Animation CRUD
  addAnimation: (name?: string) => string
  removeAnimation: (id: string) => void
  selectAnimation: (id: string) => void
  renameAnimation: (id: string, name: string) => void
  duplicateAnimation: (id: string) => void
  updateAnimationProperty: (
    id: string,
    patch: Partial<Omit<Animation, "id" | "frames">>
  ) => void

  // Frame CRUD (operates on selected animation)
  addFrame: (prompt?: string) => string
  addFrameWithImage: (
    imageUrl: string,
    prompt?: string,
    imageAssetId?: string | null
  ) => string
  insertFrame: (
    targetId: string | null,
    position?: FrameInsertPosition,
    prompt?: string
  ) => string
  duplicateFrame: (id: string) => void
  copyFrame: (id: string) => void
  cutFrame: (id: string) => void
  pasteFrame: (
    targetId?: string | null,
    position?: FrameInsertPosition
  ) => string | null
  updateFrame: (id: string, patch: Partial<Frame>) => void
  removeFrame: (id: string) => void
  reorderFrames: (fromIndex: number, toIndex: number) => void
  selectFrame: (id: string | null) => void
  clearFrameActionNotice: () => void

  // Playback
  setPlaying: (playing: boolean) => void
  setCurrentFrameIndex: (index: number) => void

  // Batch generation
  generateAllFrames: () => Frame[]

  // Project management
  newProject: () => void
  loadProject: (saved: SavedProject | LegacySavedProject) => void
  toSavedProject: () => Promise<SavedProject>

  // Helpers
  getSelectedAnimation: () => Animation | null
  getSelectedFrame: () => Frame | null
  getFrameById: (id: string) => Frame | undefined
  getCurrentFrames: () => Frame[]
}

// ── Helper functions ──────────────────────────────────────────────────────────
export const EMPTY_FRAMES: Frame[] = []

type AnimationStateShape = { project: AnimationProject }

function createDefaultFrame(prompt = "", fps = DEFAULT_FPS): Frame {
  return {
    id: nanoid(),
    prompt,
    imageAssetId: null,
    imageUrl: null,
    isBlank: true,
    duration: Math.round(1000 / fps),
    status: "idle",
    continuitySourceFrameId: null,
    continuityStale: false,
  }
}

function createDefaultAnimation(name: string): Animation {
  return {
    id: nanoid(),
    name,
    speed: 0,
    loop: false,
    repeatCount: 1,
    repeatTo: 0,
    pingPong: false,
    frames: [],
  }
}

function cloneFrame(source: Frame): Frame {
  const isBlank = Boolean(source.isBlank)
  return {
    ...source,
    id: nanoid(),
    status:
      isBlank || (!source.imageAssetId && !source.imageUrl) ? "idle" : "done",
    errorMessage: undefined,
    keypoints: source.keypoints?.map((keypoint) => ({ ...keypoint })),
    isBlank,
    continuitySourceFrameId: null,
    continuityStale: false,
  }
}

function hydrateFrame(frame: Frame): Frame {
  if (frame.isBlank) {
    return {
      ...frame,
      imageAssetId: null,
      imageUrl: null,
      status: frame.status === "generating" ? "idle" : frame.status,
      continuitySourceFrameId: frame.continuitySourceFrameId ?? null,
      continuityStale: frame.continuityStale ?? false,
    }
  }

  const imageAssetId = frame.imageAssetId ?? null
  const cachedImageUrl = imageAssetId
    ? getCachedImageAssetUrl(imageAssetId)
    : null
  const imageUrl = cachedImageUrl ?? frame.imageUrl ?? null

  if (!imageUrl && !imageAssetId && frame.status === "idle") {
    return {
      ...frame,
      imageAssetId: null,
      imageUrl: null,
      isBlank: true,
    }
  }

  return {
    ...frame,
    imageAssetId,
    imageUrl,
    isBlank: false,
    continuitySourceFrameId: frame.continuitySourceFrameId ?? null,
    continuityStale: frame.continuityStale ?? false,
  }
}

function resolveInsertIndex(
  frames: Frame[],
  targetId: string | null,
  position: FrameInsertPosition
) {
  if (!targetId) return frames.length

  const index = frames.findIndex((frame) => frame.id === targetId)
  if (index === -1) return frames.length

  return position === "before" ? index : index + 1
}

function insertFrameAtIndex(frames: Frame[], frame: Frame, index: number) {
  const nextFrames = [...frames]
  nextFrames.splice(index, 0, frame)
  return nextFrames
}

function getSelectedFrameAfterRemoval(
  frames: Frame[],
  removedId: string,
  selectedFrameId: string | null,
  removedIndex: number
) {
  if (selectedFrameId !== removedId) return selectedFrameId
  if (frames.length === 0) return null

  const fallbackIndex = Math.min(removedIndex, frames.length - 1)
  return frames[fallbackIndex]?.id ?? null
}

/** Map over the selected animation's frames inside the project */
function mapSelectedAnimationFrames(
  project: AnimationProject,
  mapper: (frames: Frame[]) => Frame[]
): Animation[] {
  return project.animations.map((anim) =>
    anim.id === project.selectedAnimationId
      ? { ...anim, frames: mapper(anim.frames) }
      : anim
  )
}

function resolveSelectedAnimation(project: AnimationProject): Animation | null {
  if (!project.selectedAnimationId) return null
  return (
    project.animations.find((a) => a.id === project.selectedAnimationId) ?? null
  )
}

export function selectActiveAnimation(
  state: AnimationStateShape
): Animation | null {
  return resolveSelectedAnimation(state.project)
}

export function selectActiveFrames(state: AnimationStateShape): Frame[] {
  return resolveSelectedAnimation(state.project)?.frames ?? EMPTY_FRAMES
}

export function selectActiveFrame(state: AnimationStateShape): Frame | null {
  const selectedFrameId = state.project.selectedFrameId
  if (!selectedFrameId) return null
  return (
    selectActiveFrames(state).find((frame) => frame.id === selectedFrameId) ??
    null
  )
}

function getActiveFrames(project: AnimationProject): Frame[] {
  return resolveSelectedAnimation(project)?.frames ?? EMPTY_FRAMES
}

/** Detect legacy saved project format (has frames array at root) */
function isLegacyProject(
  saved: SavedProject | LegacySavedProject
): saved is LegacySavedProject {
  return "loop" in saved && "frames" in saved && !("animations" in saved)
}

function hasFrameImage(frame: Frame) {
  return Boolean(frame.imageAssetId || frame.imageUrl) && !frame.isBlank
}

function isFrameUsableForContinuity(frame: Frame) {
  return hasFrameImage(frame) && !frame.continuityStale
}

function didFrameVisualChange(current: Frame, next: Frame) {
  return (
    current.imageAssetId !== next.imageAssetId ||
    current.imageUrl !== next.imageUrl ||
    Boolean(current.isBlank) !== Boolean(next.isBlank)
  )
}

function markFrameContinuityStale(frame: Frame) {
  if (!hasFrameImage(frame) || frame.status === "generating") {
    return frame
  }

  if (
    frame.status === "idle" &&
    !frame.errorMessage &&
    frame.continuityStale &&
    frame.continuitySourceFrameId == null
  ) {
    return frame
  }

  return {
    ...frame,
    status: "idle" as const,
    errorMessage: undefined,
    continuitySourceFrameId: null,
    continuityStale: true,
  }
}

function invalidateContinuityFromIndex(
  frames: Frame[],
  startIndex: number,
  invalidSourceIds: Iterable<string> = []
) {
  if (startIndex < 0 || startIndex >= frames.length) {
    return frames
  }

  const blockedSourceIds = new Set(invalidSourceIds)
  let changed = false
  let lastUsableFrameId: string | null = null
  const nextFrames = frames.map((frame, index) => {
    let nextFrame = frame
    const continuitySourceFrameId = frame.continuitySourceFrameId ?? null

    if (index >= startIndex) {
      const sourceChanged =
        continuitySourceFrameId !== null &&
        blockedSourceIds.has(continuitySourceFrameId)
      const timelineSourceChanged =
        continuitySourceFrameId !== null &&
        continuitySourceFrameId !== lastUsableFrameId

      if (sourceChanged || timelineSourceChanged) {
        nextFrame = markFrameContinuityStale(frame)
        if (nextFrame !== frame) {
          changed = true
        }
      }

      if (nextFrame.continuityStale) {
        blockedSourceIds.add(nextFrame.id)
      }
    }

    if (isFrameUsableForContinuity(nextFrame)) {
      lastUsableFrameId = nextFrame.id
    }

    return nextFrame
  })

  return changed ? nextFrames : frames
}

async function normalizeFrameAsset(frame: Frame): Promise<Frame> {
  if (frame.isBlank) {
    if (!frame.imageAssetId && !frame.imageUrl) return frame
    return {
      ...frame,
      imageAssetId: null,
      imageUrl: null,
    }
  }

  if (frame.imageAssetId) {
    if (frame.imageUrl) return frame

    const resolvedUrl = await resolveImageAssetUrl(frame.imageAssetId)
    if (!resolvedUrl) return frame

    return {
      ...frame,
      imageUrl: resolvedUrl,
    }
  }

  if (!frame.imageUrl) {
    return {
      ...frame,
      imageAssetId: null,
      imageUrl: null,
      isBlank: true,
      status: frame.status === "done" ? "idle" : frame.status,
    }
  }

  try {
    const asset = await saveImageSourceAsAsset(frame.imageUrl)
    return {
      ...frame,
      imageAssetId: asset.assetId,
      imageUrl: asset.imageUrl,
      isBlank: false,
      status: "done",
      errorMessage: undefined,
    }
  } catch (error) {
    console.error(
      "[animation-store] Failed to migrate frame image to asset:",
      error
    )
    return frame
  }
}

async function normalizeProjectAssets(project: AnimationProject) {
  let projectChanged = false
  const nextAnimations: Animation[] = []

  for (const animation of project.animations) {
    let animationChanged = false
    const nextFrames: Frame[] = []

    for (const frame of animation.frames) {
      const normalizedFrame = await normalizeFrameAsset(frame)
      if (normalizedFrame !== frame) {
        animationChanged = true
      }
      nextFrames.push(normalizedFrame)
    }

    if (animationChanged) {
      projectChanged = true
      nextAnimations.push({ ...animation, frames: nextFrames })
    } else {
      nextAnimations.push(animation)
    }
  }

  if (!projectChanged) {
    return { project, changed: false as const }
  }

  return {
    project: { ...project, animations: nextAnimations },
    changed: true as const,
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const defaultAnimation = createDefaultAnimation("Animation 1")

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  project: {
    id: nanoid(),
    name: "Untitled Project",
    fps: DEFAULT_FPS,
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
    animations: [defaultAnimation],
    selectedAnimationId: defaultAnimation.id,
    selectedFrameId: null,
  },
  playback: {
    isPlaying: false,
    currentFrameIndex: 0,
  },
  frameClipboard: null,
  frameActionNotice: null,

  // ── Project actions ───────────────────────────────────────────────────────

  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),

  setFps: (fps) =>
    set((s) => {
      const duration = Math.round(1000 / fps)
      return {
        project: {
          ...s.project,
          fps,
          animations: s.project.animations.map((anim) => ({
            ...anim,
            frames: anim.frames.map((f) => ({ ...f, duration })),
          })),
        },
      }
    }),

  // ── Animation CRUD ────────────────────────────────────────────────────────

  addAnimation: (name) => {
    const count = get().project.animations.length
    const anim = createDefaultAnimation(name ?? `Animation ${count + 1}`)
    set((s) => ({
      project: {
        ...s.project,
        animations: [...s.project.animations, anim],
        selectedAnimationId: anim.id,
        selectedFrameId: null,
      },
      playback: { isPlaying: false, currentFrameIndex: 0 },
    }))
    return anim.id
  },

  removeAnimation: (id) =>
    set((s) => {
      const animations = s.project.animations.filter((a) => a.id !== id)
      if (animations.length === 0) {
        const fallback = createDefaultAnimation("Animation 1")
        return {
          project: {
            ...s.project,
            animations: [fallback],
            selectedAnimationId: fallback.id,
            selectedFrameId: null,
          },
          playback: { isPlaying: false, currentFrameIndex: 0 },
        }
      }

      const wasSelected = s.project.selectedAnimationId === id
      const selectedAnimationId = wasSelected
        ? animations[0].id
        : s.project.selectedAnimationId
      const selectedFrameId = wasSelected
        ? (animations[0].frames[0]?.id ?? null)
        : s.project.selectedFrameId

      return {
        project: {
          ...s.project,
          animations,
          selectedAnimationId,
          selectedFrameId,
        },
        playback: { isPlaying: false, currentFrameIndex: 0 },
      }
    }),

  selectAnimation: (id) =>
    set((s) => {
      const anim = s.project.animations.find((a) => a.id === id)
      if (!anim) return s
      return {
        project: {
          ...s.project,
          selectedAnimationId: id,
          selectedFrameId: anim.frames[0]?.id ?? null,
        },
        playback: { isPlaying: false, currentFrameIndex: 0 },
      }
    }),

  renameAnimation: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: s.project.animations.map((a) =>
          a.id === id ? { ...a, name } : a
        ),
      },
    })),

  duplicateAnimation: (id) => {
    const source = get().project.animations.find((a) => a.id === id)
    if (!source) return

    const dupe: Animation = {
      ...source,
      id: nanoid(),
      name: `${source.name} Copy`,
      frames: source.frames.map(cloneFrame),
    }

    set((s) => ({
      project: {
        ...s.project,
        animations: [...s.project.animations, dupe],
        selectedAnimationId: dupe.id,
        selectedFrameId: dupe.frames[0]?.id ?? null,
      },
      playback: { isPlaying: false, currentFrameIndex: 0 },
    }))
  },

  updateAnimationProperty: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: s.project.animations.map((a) =>
          a.id === id ? { ...a, ...patch } : a
        ),
      },
    })),

  // ── Frame CRUD (operates on selected animation) ───────────────────────────

  addFrame: (prompt = "") => {
    const { fps } = get().project
    const frame = createDefaultFrame(prompt, fps)
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => [
          ...frames,
          frame,
        ]),
        selectedFrameId: frame.id,
      },
    }))
    return frame.id
  },

  addFrameWithImage: (imageUrl, prompt = "", imageAssetId = null) => {
    const { fps } = get().project
    const frame = createDefaultFrame(prompt, fps)
    frame.imageAssetId = imageAssetId
    frame.imageUrl = imageUrl
    frame.isBlank = false
    frame.status = "done"
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => [
          ...frames,
          frame,
        ]),
        selectedFrameId: frame.id,
      },
    }))
    return frame.id
  },

  insertFrame: (targetId, position = "after", prompt = "") => {
    const { fps } = get().project
    const frame = createDefaultFrame(prompt, fps)

    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const insertIndex = resolveInsertIndex(frames, targetId, position)
          return insertFrameAtIndex(frames, frame, insertIndex)
        }),
        selectedFrameId: frame.id,
      },
    }))

    return frame.id
  },

  duplicateFrame: (id) => {
    const frames = getActiveFrames(get().project)
    const source = frames.find((f) => f.id === id)
    if (!source) return

    const dupe = cloneFrame(source)
    const idx = frames.findIndex((f) => f.id === id)
    const insertIndex = idx + 1

    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frs) => {
          const nextFrames = insertFrameAtIndex(frs, dupe, insertIndex)
          return hasFrameImage(dupe)
            ? invalidateContinuityFromIndex(nextFrames, insertIndex + 1)
            : nextFrames
        }),
        selectedFrameId: dupe.id,
      },
    }))
  },

  copyFrame: (id) => {
    const frames = getActiveFrames(get().project)
    const index = frames.findIndex((frame) => frame.id === id)
    if (index === -1) return

    const source = frames[index]
    set({
      frameClipboard: { frame: cloneFrame(source), mode: "copy" },
      frameActionNotice: {
        id: nanoid(),
        message: `Copied frame ${index + 1}`,
      },
    })
  },

  cutFrame: (id) =>
    set((s) => {
      const frames = getActiveFrames(s.project)
      const index = frames.findIndex((frame) => frame.id === id)
      if (index === -1) return s

      const source = frames[index]
      const remaining = frames.filter((frame) => frame.id !== id)
      const selectedFrameId = getSelectedFrameAfterRemoval(
        remaining,
        id,
        s.project.selectedFrameId,
        index
      )

      return {
        project: {
          ...s.project,
          animations: mapSelectedAnimationFrames(s.project, () =>
            invalidateContinuityFromIndex(remaining, index, [id])
          ),
          selectedFrameId,
        },
        frameClipboard: { frame: cloneFrame(source), mode: "cut" },
        frameActionNotice: {
          id: nanoid(),
          message: `Cut frame ${index + 1}`,
        },
      }
    }),

  pasteFrame: (targetId = null, position = "after") => {
    const clipboard = get().frameClipboard
    if (!clipboard) return null

    const currentFrames = getActiveFrames(get().project)
    const insertedIndex = resolveInsertIndex(currentFrames, targetId, position)
    const frame = cloneFrame(clipboard.frame)
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const insertIndex = resolveInsertIndex(frames, targetId, position)
          const nextFrames = insertFrameAtIndex(frames, frame, insertIndex)
          return hasFrameImage(frame)
            ? invalidateContinuityFromIndex(nextFrames, insertIndex + 1)
            : nextFrames
        }),
        selectedFrameId: frame.id,
      },
      frameActionNotice: {
        id: nanoid(),
        message:
          clipboard.mode === "cut"
            ? `Pasted cut frame at ${insertedIndex + 1}`
            : `Pasted frame at ${insertedIndex + 1}`,
      },
    }))

    return frame.id
  },

  updateFrame: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          let targetIndex = -1
          let visualChanged = false

          const nextFrames = frames.map((frame, index) => {
            if (frame.id !== id) return frame

            targetIndex = index
            const next = { ...frame, ...patch }
            if (next.isBlank) {
              next.imageAssetId = null
              next.imageUrl = null
              next.continuitySourceFrameId = null
              next.continuityStale = false
            }

            visualChanged = didFrameVisualChange(frame, next)
            return next
          })
          if (!visualChanged || targetIndex === -1) {
            return nextFrames
          }

          return invalidateContinuityFromIndex(nextFrames, targetIndex + 1, [
            id,
          ])
        }),
      },
    })),

  removeFrame: (id) =>
    set((s) => {
      const frames = getActiveFrames(s.project)
      const removedIndex = frames.findIndex((frame) => frame.id === id)
      if (removedIndex === -1) return s

      const remaining = frames.filter((f) => f.id !== id)
      const selectedFrameId = getSelectedFrameAfterRemoval(
        remaining,
        id,
        s.project.selectedFrameId,
        removedIndex
      )

      return {
        project: {
          ...s.project,
          animations: mapSelectedAnimationFrames(s.project, () =>
            invalidateContinuityFromIndex(remaining, removedIndex, [id])
          ),
          selectedFrameId,
        },
        frameActionNotice: {
          id: nanoid(),
          message: `Deleted frame ${removedIndex + 1}`,
        },
      }
    }),

  reorderFrames: (fromIndex, toIndex) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const nextFrames = [...frames]
          const [moved] = nextFrames.splice(fromIndex, 1)
          nextFrames.splice(toIndex, 0, moved)
          return invalidateContinuityFromIndex(
            nextFrames,
            Math.min(fromIndex, toIndex)
          )
        }),
      },
    })),

  selectFrame: (id) =>
    set((s) => ({ project: { ...s.project, selectedFrameId: id } })),

  clearFrameActionNotice: () => set({ frameActionNotice: null }),

  // ── Playback ──────────────────────────────────────────────────────────────

  setPlaying: (isPlaying) =>
    set((s) => ({ playback: { ...s.playback, isPlaying } })),

  setCurrentFrameIndex: (currentFrameIndex) =>
    set((s) => ({ playback: { ...s.playback, currentFrameIndex } })),

  generateAllFrames: () => {
    return getActiveFrames(get().project).filter(
      (f) => f.status === "idle" || f.status === "error"
    )
  },

  // ── Project management ────────────────────────────────────────────────────

  newProject: () => {
    const anim = createDefaultAnimation("Animation 1")
    set({
      project: {
        id: nanoid(),
        name: "Untitled Project",
        fps: DEFAULT_FPS,
        width: DEFAULT_FRAME_WIDTH,
        height: DEFAULT_FRAME_HEIGHT,
        animations: [anim],
        selectedAnimationId: anim.id,
        selectedFrameId: null,
      },
      playback: {
        isPlaying: false,
        currentFrameIndex: 0,
      },
      frameClipboard: null,
      frameActionNotice: null,
    })
  },

  loadProject: (saved) => {
    const applyProject = (project: AnimationProject) => {
      const firstAnimation = project.animations[0]
      set({
        project: {
          id: project.id,
          name: project.name,
          fps: project.fps,
          width: project.width,
          height: project.height,
          animations: project.animations,
          selectedAnimationId: firstAnimation?.id ?? null,
          selectedFrameId: firstAnimation?.frames[0]?.id ?? null,
        },
        playback: { isPlaying: false, currentFrameIndex: 0 },
        frameClipboard: null,
        frameActionNotice: null,
      })

      void (async () => {
        const currentProject = get().project
        if (currentProject.id !== project.id) return

        const normalized = await normalizeProjectAssets(currentProject)
        if (!normalized.changed) return

        set((state) => {
          if (state.project.id !== project.id) return state
          return {
            project: normalized.project,
          }
        })
      })()
    }

    // Handle legacy format (single frames array)
    if (isLegacyProject(saved)) {
      const hydratedFrames = saved.frames.map((frame) => hydrateFrame(frame))
      const anim: Animation = {
        id: nanoid(),
        name: "Animation 1",
        speed: 0,
        loop: saved.loop,
        repeatCount: 1,
        repeatTo: 0,
        pingPong: false,
        frames: hydratedFrames,
      }

      applyProject({
        id: saved.id,
        name: saved.name,
        fps: saved.fps,
        width: saved.width,
        height: saved.height,
        animations: [anim],
        selectedAnimationId: anim.id,
        selectedFrameId: hydratedFrames[0]?.id ?? null,
      })
      return
    }

    // New format with animations array
    const hydratedAnimations = saved.animations.map((anim) => ({
      ...anim,
      frames: anim.frames.map((frame) => hydrateFrame(frame)),
    }))

    applyProject({
      id: saved.id,
      name: saved.name,
      fps: saved.fps,
      width: saved.width,
      height: saved.height,
      animations: hydratedAnimations,
      selectedAnimationId: hydratedAnimations[0]?.id ?? null,
      selectedFrameId: hydratedAnimations[0]?.frames[0]?.id ?? null,
    })
  },

  toSavedProject: async () => {
    const snapshot = get().project
    const normalized = await normalizeProjectAssets(snapshot)
    const project = normalized.project

    if (normalized.changed) {
      set((state) => {
        if (state.project.id !== project.id) return state
        return {
          project,
        }
      })
    }

    const allFrames = project.animations.flatMap((a) => a.frames)
    const thumbnailFrame =
      allFrames.find((frame) => hasFrameImage(frame)) ?? null
    const savedAnimations = project.animations.map((animation) => ({
      ...animation,
      frames: animation.frames.map((frame) => ({
        ...frame,
        imageUrl:
          frame.imageAssetId && !frame.imageAssetId.startsWith("mem-")
            ? null
            : frame.imageUrl,
      })),
    }))

    return {
      id: project.id,
      name: project.name,
      fps: project.fps,
      width: project.width,
      height: project.height,
      animations: savedAnimations,
      savedAt: Date.now(),
      thumbnailAssetId: thumbnailFrame?.imageAssetId ?? null,
      thumbnailUrl: thumbnailFrame?.imageUrl ?? null,
      frameCount: allFrames.length,
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  getSelectedAnimation: () => {
    return resolveSelectedAnimation(get().project)
  },

  getSelectedFrame: () => {
    return selectActiveFrame(get())
  },

  getFrameById: (id) => {
    return getActiveFrames(get().project).find((f) => f.id === id)
  },

  getCurrentFrames: () => {
    return getActiveFrames(get().project)
  },
}))
