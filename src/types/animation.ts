export type FrameStatus = "idle" | "generating" | "done" | "error";

export interface Frame {
  id: string;
  prompt: string;
  imageUrl: string | null;
  duration: number; // ms per frame
  status: FrameStatus;
  errorMessage?: string;
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

export interface GenerateFrameRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface GenerateFrameResponse {
  imageUrl: string;
}
