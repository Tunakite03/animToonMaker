import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Frame, AnimationProject, PlaybackState, SavedProject } from "@/types/animation";
import {
  DEFAULT_FPS,
  DEFAULT_FRAME_WIDTH,
  DEFAULT_FRAME_HEIGHT,
} from "@/lib/constants";
import { createTransparentImage } from "@/lib/image-utils";

type FrameInsertPosition = "before" | "after";

interface FrameClipboard {
  frame: Frame;
  mode: "copy" | "cut";
}

interface AnimationStore {
  project: AnimationProject;
  playback: PlaybackState;
  frameClipboard: FrameClipboard | null;

  // Project actions
  setProjectName: (name: string) => void;
  setFps: (fps: number) => void;
  setLoop: (loop: boolean) => void;

  // Frame CRUD
  addFrame: (prompt?: string) => string;
  addFrameWithImage: (imageUrl: string, prompt?: string) => string;
  insertFrame: (
    targetId: string | null,
    position?: FrameInsertPosition,
    prompt?: string,
  ) => string;
  duplicateFrame: (id: string) => void;
  copyFrame: (id: string) => void;
  cutFrame: (id: string) => void;
  pasteFrame: (
    targetId?: string | null,
    position?: FrameInsertPosition,
  ) => string | null;
  updateFrame: (id: string, patch: Partial<Frame>) => void;
  removeFrame: (id: string) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  selectFrame: (id: string | null) => void;

  // Playback
  setPlaying: (playing: boolean) => void;
  setCurrentFrameIndex: (index: number) => void;

  // Batch generation
  generateAllFrames: () => Frame[];

  // Project management
  newProject: () => void;
  loadProject: (saved: SavedProject) => void;
  toSavedProject: () => SavedProject;

  // Helpers
  getSelectedFrame: () => Frame | null;
  getFrameById: (id: string) => Frame | undefined;
}

function createDefaultFrame(
  prompt = "",
  fps = DEFAULT_FPS,
  width = DEFAULT_FRAME_WIDTH,
  height = DEFAULT_FRAME_HEIGHT,
): Frame {
  return {
    id: nanoid(),
    prompt,
    imageUrl: createTransparentImage(width, height),
    isBlank: true,
    duration: Math.round(1000 / fps),
    status: "idle",
  };
}

function cloneFrame(source: Frame): Frame {
  const isBlank = Boolean(source.isBlank);
  return {
    ...source,
    id: nanoid(),
    status: isBlank ? "idle" : source.imageUrl ? "done" : "idle",
    errorMessage: undefined,
    keypoints: source.keypoints?.map((keypoint) => ({ ...keypoint })),
    isBlank,
  };
}

function hydrateFrame(frame: Frame, width: number, height: number): Frame {
  if (frame.isBlank) {
    return {
      ...frame,
      imageUrl: frame.imageUrl ?? createTransparentImage(width, height),
      status: frame.status === "generating" ? "idle" : frame.status,
    };
  }

  if (!frame.imageUrl && frame.status === "idle") {
    return {
      ...frame,
      imageUrl: createTransparentImage(width, height),
      isBlank: true,
    };
  }

  return frame;
}

function resolveInsertIndex(
  frames: Frame[],
  targetId: string | null,
  position: FrameInsertPosition,
) {
  if (!targetId) return frames.length;

  const index = frames.findIndex((frame) => frame.id === targetId);
  if (index === -1) return frames.length;

  return position === "before" ? index : index + 1;
}

function insertFrameAtIndex(frames: Frame[], frame: Frame, index: number) {
  const nextFrames = [...frames];
  nextFrames.splice(index, 0, frame);
  return nextFrames;
}

function getSelectedFrameAfterRemoval(
  frames: Frame[],
  removedId: string,
  selectedFrameId: string | null,
  removedIndex: number,
) {
  if (selectedFrameId !== removedId) return selectedFrameId;
  if (frames.length === 0) return null;

  const fallbackIndex = Math.min(removedIndex, frames.length - 1);
  return frames[fallbackIndex]?.id ?? null;
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
  frameClipboard: null,

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
    const { fps, width, height } = get().project;
    const frame = createDefaultFrame(prompt, fps, width, height);
    set((s) => ({
      project: {
        ...s.project,
        frames: [...s.project.frames, frame],
        selectedFrameId: frame.id,
      },
    }));
    return frame.id;
  },

  addFrameWithImage: (imageUrl, prompt = "") => {
    const { fps, width, height } = get().project;
    const frame = createDefaultFrame(prompt, fps, width, height);
    frame.imageUrl = imageUrl;
    frame.isBlank = false;
    frame.status = "done";
    set((s) => ({
      project: {
        ...s.project,
        frames: [...s.project.frames, frame],
        selectedFrameId: frame.id,
      },
    }));
    return frame.id;
  },

  insertFrame: (targetId, position = "after", prompt = "") => {
    const { fps, width, height } = get().project;
    const frame = createDefaultFrame(prompt, fps, width, height);

    set((s) => {
      const insertIndex = resolveInsertIndex(s.project.frames, targetId, position);
      return {
        project: {
          ...s.project,
          frames: insertFrameAtIndex(s.project.frames, frame, insertIndex),
          selectedFrameId: frame.id,
        },
      };
    });

    return frame.id;
  },

  duplicateFrame: (id) => {
    const state = get();
    const source = state.project.frames.find((f) => f.id === id);
    if (!source) return;

    const dupe = cloneFrame(source);
    const idx = state.project.frames.findIndex((f) => f.id === id);
    const frames = insertFrameAtIndex(state.project.frames, dupe, idx + 1);
    set((s) => ({
      project: { ...s.project, frames, selectedFrameId: dupe.id },
    }));
  },

  copyFrame: (id) => {
    const source = get().project.frames.find((frame) => frame.id === id);
    if (!source) return;

    set({ frameClipboard: { frame: cloneFrame(source), mode: "copy" } });
  },

  cutFrame: (id) =>
    set((s) => {
      const index = s.project.frames.findIndex((frame) => frame.id === id);
      if (index === -1) return s;

      const source = s.project.frames[index];
      const frames = s.project.frames.filter((frame) => frame.id !== id);
      const selectedFrameId = getSelectedFrameAfterRemoval(
        frames,
        id,
        s.project.selectedFrameId,
        index,
      );

      return {
        project: { ...s.project, frames, selectedFrameId },
        frameClipboard: { frame: cloneFrame(source), mode: "cut" },
      };
    }),

  pasteFrame: (targetId = null, position = "after") => {
    const clipboard = get().frameClipboard;
    if (!clipboard) return null;

    const frame = cloneFrame(clipboard.frame);
    set((s) => {
      const insertIndex = resolveInsertIndex(s.project.frames, targetId, position);
      return {
        project: {
          ...s.project,
          frames: insertFrameAtIndex(s.project.frames, frame, insertIndex),
          selectedFrameId: frame.id,
        },
      };
    });

    return frame.id;
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
      const removedIndex = s.project.frames.findIndex((frame) => frame.id === id);
      if (removedIndex === -1) return s;

      const frames = s.project.frames.filter((f) => f.id !== id);
      const selectedFrameId = getSelectedFrameAfterRemoval(
        frames,
        id,
        s.project.selectedFrameId,
        removedIndex,
      );

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

  newProject: () => {
    set({
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
      frameClipboard: null,
    });
  },

  loadProject: (saved) => {
    const hydratedFrames = saved.frames.map((frame) =>
      hydrateFrame(frame, saved.width, saved.height),
    );

    set({
      project: {
        id: saved.id,
        name: saved.name,
        fps: saved.fps,
        width: saved.width,
        height: saved.height,
        loop: saved.loop,
        frames: hydratedFrames,
        selectedFrameId: hydratedFrames.length > 0 ? hydratedFrames[0].id : null,
      },
      playback: {
        isPlaying: false,
        currentFrameIndex: 0,
      },
      frameClipboard: null,
    });
  },

  toSavedProject: () => {
    const { project } = get();
    const thumbnail =
      project.frames.find((f) => f.imageUrl && !f.isBlank)?.imageUrl ?? null;
    return {
      id: project.id,
      name: project.name,
      fps: project.fps,
      width: project.width,
      height: project.height,
      loop: project.loop,
      frames: project.frames,
      savedAt: Date.now(),
      thumbnailUrl: thumbnail,
      frameCount: project.frames.length,
    };
  },

  getSelectedFrame: () => {
    const { frames, selectedFrameId } = get().project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  },

  getFrameById: (id) => {
    return get().project.frames.find((f) => f.id === id);
  },
}));
