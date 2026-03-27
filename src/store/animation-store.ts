"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Frame, AnimationProject, PlaybackState } from "@/types/animation";
import {
  DEFAULT_FPS,
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
} from "@/lib/constants";

interface AnimationStore {
  project: AnimationProject;
  playback: PlaybackState;

  // Project actions
  setProjectName: (name: string) => void;
  setFps: (fps: number) => void;
  setLoop: (loop: boolean) => void;

  // Frame CRUD
  addFrame: (prompt?: string) => string;
  duplicateFrame: (id: string) => void;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  removeFrame: (id: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  selectFrame: (id: string | null) => void;

  // Playback
  setPlaying: (playing: boolean) => void;
  setCurrentFrameIndex: (index: number) => void;

  // Batch generation
  generateAllFrames: () => Frame[];

  // Helpers
  getSelectedFrame: () => Frame | null;
  getFrameById: (id: string) => Frame | undefined;
}

function createDefaultFrame(prompt = ""): Frame {
  return {
    id: nanoid(),
    prompt,
    imageUrl: null,
    duration: Math.round(1000 / DEFAULT_FPS),
    status: "idle",
  };
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  project: {
    id: nanoid(),
    name: "Untitled Animation",
    fps: DEFAULT_FPS,
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
    loop: true,
    frames: [],
    selectedFrameId: null,
  },
  playback: {
    isPlaying: false,
    currentFrameIndex: 0,
  },

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  setFps: (fps) =>
    set((s) => {
      const duration = Math.round(1000 / fps);
      return {
        project: {
          ...s.project,
          fps,
          frames: s.project.frames.map((f) => ({ ...f, duration })),
        },
      };
    }),

  setLoop: (loop) =>
    set((s) => ({ project: { ...s.project, loop } })),

  addFrame: (prompt = "") => {
    const frame = createDefaultFrame(prompt);
    const fps = get().project.fps;
    frame.duration = Math.round(1000 / fps);
    set((s) => ({
      project: {
        ...s.project,
        frames: [...s.project.frames, frame],
        selectedFrameId: frame.id,
      },
    }));
    return frame.id;
  },

  duplicateFrame: (id) => {
    const state = get();
    const source = state.project.frames.find((f) => f.id === id);
    if (!source) return;
    const dupe: Frame = {
      ...source,
      id: nanoid(),
      status: source.imageUrl ? "done" : "idle",
    };
    const idx = state.project.frames.findIndex((f) => f.id === id);
    const frames = [...state.project.frames];
    frames.splice(idx + 1, 0, dupe);
    set((s) => ({
      project: { ...s.project, frames, selectedFrameId: dupe.id },
    }));
  },

  updateFrame: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        frames: s.project.frames.map((f) =>
          f.id === id ? { ...f, ...patch } : f,
        ),
      },
    })),

  removeFrame: (id) =>
    set((s) => {
      const frames = s.project.frames.filter((f) => f.id !== id);
      let selectedFrameId = s.project.selectedFrameId;
      if (selectedFrameId === id) {
        selectedFrameId = frames.length > 0 ? frames[0].id : null;
      }
      return { project: { ...s.project, frames, selectedFrameId } };
    }),

  reorderFrames: (fromIndex, toIndex) =>
    set((s) => {
      const frames = [...s.project.frames];
      const [moved] = frames.splice(fromIndex, 1);
      frames.splice(toIndex, 0, moved);
      return { project: { ...s.project, frames } };
    }),

  selectFrame: (id) =>
    set((s) => ({ project: { ...s.project, selectedFrameId: id } })),

  setPlaying: (isPlaying) =>
    set((s) => ({ playback: { ...s.playback, isPlaying } })),

  setCurrentFrameIndex: (currentFrameIndex) =>
    set((s) => ({ playback: { ...s.playback, currentFrameIndex } })),

  generateAllFrames: () => {
    return get().project.frames.filter(
      (f) => f.status === "idle" || f.status === "error",
    );
  },

  getSelectedFrame: () => {
    const { frames, selectedFrameId } = get().project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  },

  getFrameById: (id) => {
    return get().project.frames.find((f) => f.id === id);
  },
}));
