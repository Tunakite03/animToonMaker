export type FrameStatus = "idle" | "generating" | "done" | "error";

export interface FrameKeypoint {
  id: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  label: string;
  color: string;
}

export interface Frame {
  id: string;
  prompt: string;
  imageUrl: string | null;
  isBlank?: boolean;
  duration: number; // ms per frame
  status: FrameStatus;
  errorMessage?: string;
  keypoints?: FrameKeypoint[];
}

export interface AnimationProject {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  loop: boolean;
  frames: Frame[];
  selectedFrameId: string | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrameIndex: number;
}

export interface SavedProject {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  loop: boolean;
  frames: Frame[];
  savedAt: number; // timestamp
  thumbnailUrl: string | null; // first frame with image, or null
  frameCount: number;
}

export interface GenerateFrameRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface GenerateFrameResponse {
  imageUrl: string;
}
