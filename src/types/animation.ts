export type FrameStatus = "idle" | "generating" | "done" | "error"

export interface FrameKeypoint {
  id: string
  x: number // 0-1 normalized
  y: number // 0-1 normalized
  label: string
  color: string
}

export interface Frame {
  id: string
  prompt: string
  imageAssetId: string | null
  imageUrl: string | null
  isBlank?: boolean
  duration: number // ms per frame
  status: FrameStatus
  errorMessage?: string
  continuitySourceFrameId?: string | null
  continuityStale?: boolean
  keypoints?: FrameKeypoint[]
}

export interface Animation {
  id: string
  name: string
  speed: number // FPS override for this animation (0 = use project default)
  loop: boolean
  repeatCount: number
  repeatTo: number // frame index to repeat to
  pingPong: boolean
  frames: Frame[]
}

export interface AnimationProject {
  id: string
  name: string
  fps: number
  width: number
  height: number
  animations: Animation[]
  selectedAnimationId: string | null
  selectedFrameId: string | null
}

export interface PlaybackState {
  isPlaying: boolean
  currentFrameIndex: number
}

export interface SavedProject {
  id: string
  name: string
  fps: number
  width: number
  height: number
  animations: Animation[]
  savedAt: number // timestamp
  thumbnailAssetId: string | null
  thumbnailUrl: string | null // first frame with image, or null
  frameCount: number
}

/** @deprecated Legacy format — used for migration only */
export interface LegacySavedProject {
  id: string
  name: string
  fps: number
  width: number
  height: number
  loop: boolean
  frames: Frame[]
  savedAt: number
  thumbnailAssetId?: string | null
  thumbnailUrl: string | null
  frameCount: number
}

export interface GenerateFrameRequest {
  prompt: string
  width?: number
  height?: number
  style?: string
}

export interface GenerateFrameResponse {
  imageUrl: string
}
