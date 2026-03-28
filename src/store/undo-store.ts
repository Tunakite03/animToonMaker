import { create } from "zustand"
import { useAnimationStore } from "./animation-store"
import type {
  Animation,
  AnimationProject,
  Frame,
  FrameKeypoint,
} from "@/types/animation"

const MAX_HISTORY = 50

interface UndoStore {
  pastStates: AnimationProject[]
  futureStates: AnimationProject[]
  undo: () => void
  redo: () => void
  clearHistory: () => void
}

let skipTracking = false

function hasStableFrameImage(frame: Frame) {
  return Boolean(frame.imageAssetId || frame.imageUrl) && !frame.isBlank
}

function sanitizeFrameForUndo(frame: Frame): Frame {
  const hasImage = hasStableFrameImage(frame)
  const status = hasImage && !frame.continuityStale ? "done" : "idle"

  return {
    ...frame,
    status,
    errorMessage: undefined,
  }
}

function sanitizeProjectForUndo(project: AnimationProject): AnimationProject {
  return {
    ...project,
    animations: project.animations.map((animation) => ({
      ...animation,
      frames: animation.frames.map(sanitizeFrameForUndo),
    })),
  }
}

function areKeypointsEqual(a?: FrameKeypoint[], b?: FrameKeypoint[]): boolean {
  if (a === b) return true
  if (!a || !b) return !a && !b
  if (a.length !== b.length) return false

  for (let index = 0; index < a.length; index += 1) {
    const current = a[index]
    const other = b[index]
    if (
      current.id !== other.id ||
      current.x !== other.x ||
      current.y !== other.y ||
      current.label !== other.label ||
      current.color !== other.color
    ) {
      return false
    }
  }

  return true
}

function areFramesEquivalentForUndo(a: Frame, b: Frame): boolean {
  if (a === b) return true

  return (
    a.id === b.id &&
    a.prompt === b.prompt &&
    a.imageAssetId === b.imageAssetId &&
    a.isBlank === b.isBlank &&
    a.duration === b.duration &&
    a.continuitySourceFrameId === b.continuitySourceFrameId &&
    a.continuityStale === b.continuityStale &&
    areKeypointsEqual(a.keypoints, b.keypoints)
  )
}

function areAnimationsEquivalentForUndo(a: Animation, b: Animation): boolean {
  if (a === b) return true
  if (a.id !== b.id) return false
  if (a.name !== b.name) return false
  if (a.speed !== b.speed) return false
  if (a.loop !== b.loop) return false
  if (a.repeatCount !== b.repeatCount) return false
  if (a.repeatTo !== b.repeatTo) return false
  if (a.pingPong !== b.pingPong) return false
  if (a.frames.length !== b.frames.length) return false

  for (let index = 0; index < a.frames.length; index += 1) {
    if (!areFramesEquivalentForUndo(a.frames[index], b.frames[index])) {
      return false
    }
  }

  return true
}

function areProjectsEquivalentForUndo(
  previous: AnimationProject,
  current: AnimationProject
): boolean {
  if (previous === current) return true
  if (previous.id !== current.id) return false
  if (previous.name !== current.name) return false
  if (previous.fps !== current.fps) return false
  if (previous.width !== current.width) return false
  if (previous.height !== current.height) return false
  if (previous.animations.length !== current.animations.length) return false

  for (let index = 0; index < previous.animations.length; index += 1) {
    if (
      !areAnimationsEquivalentForUndo(
        previous.animations[index],
        current.animations[index]
      )
    ) {
      return false
    }
  }

  return true
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  pastStates: [],
  futureStates: [],

  undo: () => {
    const { pastStates, futureStates } = get()
    if (pastStates.length === 0) return

    const previous = pastStates[pastStates.length - 1]
    const currentProject = sanitizeProjectForUndo(
      useAnimationStore.getState().project
    )

    skipTracking = true
    set({
      pastStates: pastStates.slice(0, -1),
      futureStates: [currentProject, ...futureStates],
    })
    useAnimationStore.setState({
      project: previous,
      playback: { isPlaying: false, currentFrameIndex: 0 },
    })
    skipTracking = false
  },

  redo: () => {
    const { pastStates, futureStates } = get()
    if (futureStates.length === 0) return

    const next = futureStates[0]
    const currentProject = sanitizeProjectForUndo(
      useAnimationStore.getState().project
    )

    skipTracking = true
    set({
      pastStates: [...pastStates, currentProject],
      futureStates: futureStates.slice(1),
    })
    useAnimationStore.setState({
      project: next,
      playback: { isPlaying: false, currentFrameIndex: 0 },
    })
    skipTracking = false
  },

  clearHistory: () => set({ pastStates: [], futureStates: [] }),
}))

// ── Auto-track animation store changes ────────────────────────────────────────

let lastProjectId = useAnimationStore.getState().project.id

useAnimationStore.subscribe((state, prevState) => {
  if (skipTracking) return
  if (state.project === prevState.project) return

  // Project ID changed (new / load) → clear history, don't record old project
  if (state.project.id !== lastProjectId) {
    lastProjectId = state.project.id
    useUndoStore.setState({ pastStates: [], futureStates: [] })
    return
  }

  // Ignore selection changes and transient frame flags (status, errorMessage)
  // so undo history only captures meaningful content edits.
  if (areProjectsEquivalentForUndo(prevState.project, state.project)) {
    return
  }

  useUndoStore.setState((s) => ({
    pastStates: [
      ...s.pastStates,
      sanitizeProjectForUndo(prevState.project),
    ].slice(-MAX_HISTORY),
    futureStates: [],
  }))
})
