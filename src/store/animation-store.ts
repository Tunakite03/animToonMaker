import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Frame,
  Animation,
  AnimationProject,
  PlaybackState,
  SavedProject,
  LegacySavedProject,
} from "@/types/animation";
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

  // Animation CRUD
  addAnimation: (name?: string) => string;
  removeAnimation: (id: string) => void;
  selectAnimation: (id: string) => void;
  renameAnimation: (id: string, name: string) => void;
  duplicateAnimation: (id: string) => void;
  updateAnimationProperty: (
    id: string,
    patch: Partial<Omit<Animation, "id" | "frames">>,
  ) => void;

  // Frame CRUD (operates on selected animation)
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
  loadProject: (saved: SavedProject | LegacySavedProject) => void;
  toSavedProject: () => SavedProject;

  // Helpers
  getSelectedAnimation: () => Animation | null;
  getSelectedFrame: () => Frame | null;
  getFrameById: (id: string) => Frame | undefined;
  getCurrentFrames: () => Frame[];
}

// ── Helper functions ──────────────────────────────────────────────────────────

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

/** Map over the selected animation's frames inside the project */
function mapSelectedAnimationFrames(
  project: AnimationProject,
  mapper: (frames: Frame[]) => Frame[],
): Animation[] {
  return project.animations.map((anim) =>
    anim.id === project.selectedAnimationId
      ? { ...anim, frames: mapper(anim.frames) }
      : anim,
  );
}

function getActiveFrames(project: AnimationProject): Frame[] {
  const anim = project.animations.find(
    (a) => a.id === project.selectedAnimationId,
  );
  return anim?.frames ?? [];
}

/** Detect legacy saved project format (has frames array at root) */
function isLegacyProject(
  saved: SavedProject | LegacySavedProject,
): saved is LegacySavedProject {
  return "loop" in saved && "frames" in saved && !("animations" in saved);
}

// ── Store ─────────────────────────────────────────────────────────────────────

const defaultAnimation = createDefaultAnimation("Animation 1");

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

  // ── Project actions ───────────────────────────────────────────────────────

  setProjectName: (name) =>
    set((s) => ({ project: { ...s.project, name } })),

  setFps: (fps) =>
    set((s) => {
      const duration = Math.round(1000 / fps);
      return {
        project: {
          ...s.project,
          fps,
          animations: s.project.animations.map((anim) => ({
            ...anim,
            frames: anim.frames.map((f) => ({ ...f, duration })),
          })),
        },
      };
    }),

  // ── Animation CRUD ────────────────────────────────────────────────────────

  addAnimation: (name) => {
    const count = get().project.animations.length;
    const anim = createDefaultAnimation(name ?? `Animation ${count + 1}`);
    set((s) => ({
      project: {
        ...s.project,
        animations: [...s.project.animations, anim],
        selectedAnimationId: anim.id,
        selectedFrameId: null,
      },
      playback: { isPlaying: false, currentFrameIndex: 0 },
    }));
    return anim.id;
  },

  removeAnimation: (id) =>
    set((s) => {
      const animations = s.project.animations.filter((a) => a.id !== id);
      if (animations.length === 0) {
        const fallback = createDefaultAnimation("Animation 1");
        return {
          project: {
            ...s.project,
            animations: [fallback],
            selectedAnimationId: fallback.id,
            selectedFrameId: null,
          },
          playback: { isPlaying: false, currentFrameIndex: 0 },
        };
      }

      const wasSelected = s.project.selectedAnimationId === id;
      const selectedAnimationId = wasSelected
        ? animations[0].id
        : s.project.selectedAnimationId;
      const selectedFrameId = wasSelected
        ? animations[0].frames[0]?.id ?? null
        : s.project.selectedFrameId;

      return {
        project: { ...s.project, animations, selectedAnimationId, selectedFrameId },
        playback: { isPlaying: false, currentFrameIndex: 0 },
      };
    }),

  selectAnimation: (id) =>
    set((s) => {
      const anim = s.project.animations.find((a) => a.id === id);
      if (!anim) return s;
      return {
        project: {
          ...s.project,
          selectedAnimationId: id,
          selectedFrameId: anim.frames[0]?.id ?? null,
        },
        playback: { isPlaying: false, currentFrameIndex: 0 },
      };
    }),

  renameAnimation: (id, name) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: s.project.animations.map((a) =>
          a.id === id ? { ...a, name } : a,
        ),
      },
    })),

  duplicateAnimation: (id) => {
    const source = get().project.animations.find((a) => a.id === id);
    if (!source) return;

    const dupe: Animation = {
      ...source,
      id: nanoid(),
      name: `${source.name} Copy`,
      frames: source.frames.map(cloneFrame),
    };

    set((s) => ({
      project: {
        ...s.project,
        animations: [...s.project.animations, dupe],
        selectedAnimationId: dupe.id,
        selectedFrameId: dupe.frames[0]?.id ?? null,
      },
      playback: { isPlaying: false, currentFrameIndex: 0 },
    }));
  },

  updateAnimationProperty: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: s.project.animations.map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
      },
    })),

  // ── Frame CRUD (operates on selected animation) ───────────────────────────

  addFrame: (prompt = "") => {
    const { fps, width, height } = get().project;
    const frame = createDefaultFrame(prompt, fps, width, height);
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => [
          ...frames,
          frame,
        ]),
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
        animations: mapSelectedAnimationFrames(s.project, (frames) => [
          ...frames,
          frame,
        ]),
        selectedFrameId: frame.id,
      },
    }));
    return frame.id;
  },

  insertFrame: (targetId, position = "after", prompt = "") => {
    const { fps, width, height } = get().project;
    const frame = createDefaultFrame(prompt, fps, width, height);

    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const insertIndex = resolveInsertIndex(frames, targetId, position);
          return insertFrameAtIndex(frames, frame, insertIndex);
        }),
        selectedFrameId: frame.id,
      },
    }));

    return frame.id;
  },

  duplicateFrame: (id) => {
    const frames = getActiveFrames(get().project);
    const source = frames.find((f) => f.id === id);
    if (!source) return;

    const dupe = cloneFrame(source);
    const idx = frames.findIndex((f) => f.id === id);

    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frs) =>
          insertFrameAtIndex(frs, dupe, idx + 1),
        ),
        selectedFrameId: dupe.id,
      },
    }));
  },

  copyFrame: (id) => {
    const frames = getActiveFrames(get().project);
    const source = frames.find((frame) => frame.id === id);
    if (!source) return;

    set({ frameClipboard: { frame: cloneFrame(source), mode: "copy" } });
  },

  cutFrame: (id) =>
    set((s) => {
      const frames = getActiveFrames(s.project);
      const index = frames.findIndex((frame) => frame.id === id);
      if (index === -1) return s;

      const source = frames[index];
      const remaining = frames.filter((frame) => frame.id !== id);
      const selectedFrameId = getSelectedFrameAfterRemoval(
        remaining,
        id,
        s.project.selectedFrameId,
        index,
      );

      return {
        project: {
          ...s.project,
          animations: mapSelectedAnimationFrames(s.project, () => remaining),
          selectedFrameId,
        },
        frameClipboard: { frame: cloneFrame(source), mode: "cut" },
      };
    }),

  pasteFrame: (targetId = null, position = "after") => {
    const clipboard = get().frameClipboard;
    if (!clipboard) return null;

    const frame = cloneFrame(clipboard.frame);
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const insertIndex = resolveInsertIndex(frames, targetId, position);
          return insertFrameAtIndex(frames, frame, insertIndex);
        }),
        selectedFrameId: frame.id,
      },
    }));

    return frame.id;
  },

  updateFrame: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) =>
          frames.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        ),
      },
    })),

  removeFrame: (id) =>
    set((s) => {
      const frames = getActiveFrames(s.project);
      const removedIndex = frames.findIndex((frame) => frame.id === id);
      if (removedIndex === -1) return s;

      const remaining = frames.filter((f) => f.id !== id);
      const selectedFrameId = getSelectedFrameAfterRemoval(
        remaining,
        id,
        s.project.selectedFrameId,
        removedIndex,
      );

      return {
        project: {
          ...s.project,
          animations: mapSelectedAnimationFrames(s.project, () => remaining),
          selectedFrameId,
        },
      };
    }),

  reorderFrames: (fromIndex, toIndex) =>
    set((s) => ({
      project: {
        ...s.project,
        animations: mapSelectedAnimationFrames(s.project, (frames) => {
          const nextFrames = [...frames];
          const [moved] = nextFrames.splice(fromIndex, 1);
          nextFrames.splice(toIndex, 0, moved);
          return nextFrames;
        }),
      },
    })),

  selectFrame: (id) =>
    set((s) => ({ project: { ...s.project, selectedFrameId: id } })),

  // ── Playback ──────────────────────────────────────────────────────────────

  setPlaying: (isPlaying) =>
    set((s) => ({ playback: { ...s.playback, isPlaying } })),

  setCurrentFrameIndex: (currentFrameIndex) =>
    set((s) => ({ playback: { ...s.playback, currentFrameIndex } })),

  generateAllFrames: () => {
    return getActiveFrames(get().project).filter(
      (f) => f.status === "idle" || f.status === "error",
    );
  },

  // ── Project management ────────────────────────────────────────────────────

  newProject: () => {
    const anim = createDefaultAnimation("Animation 1");
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
    });
  },

  loadProject: (saved) => {
    // Handle legacy format (single frames array)
    if (isLegacyProject(saved)) {
      const hydratedFrames = saved.frames.map((frame) =>
        hydrateFrame(frame, saved.width, saved.height),
      );
      const anim: Animation = {
        id: nanoid(),
        name: "Animation 1",
        speed: 0,
        loop: saved.loop,
        repeatCount: 1,
        repeatTo: 0,
        pingPong: false,
        frames: hydratedFrames,
      };

      set({
        project: {
          id: saved.id,
          name: saved.name,
          fps: saved.fps,
          width: saved.width,
          height: saved.height,
          animations: [anim],
          selectedAnimationId: anim.id,
          selectedFrameId: hydratedFrames[0]?.id ?? null,
        },
        playback: { isPlaying: false, currentFrameIndex: 0 },
        frameClipboard: null,
      });
      return;
    }

    // New format with animations array
    const hydratedAnimations = saved.animations.map((anim) => ({
      ...anim,
      frames: anim.frames.map((frame) =>
        hydrateFrame(frame, saved.width, saved.height),
      ),
    }));

    const firstAnim = hydratedAnimations[0];
    set({
      project: {
        id: saved.id,
        name: saved.name,
        fps: saved.fps,
        width: saved.width,
        height: saved.height,
        animations: hydratedAnimations,
        selectedAnimationId: firstAnim?.id ?? null,
        selectedFrameId: firstAnim?.frames[0]?.id ?? null,
      },
      playback: { isPlaying: false, currentFrameIndex: 0 },
      frameClipboard: null,
    });
  },

  toSavedProject: () => {
    const { project } = get();
    const allFrames = project.animations.flatMap((a) => a.frames);
    const thumbnail =
      allFrames.find((f) => f.imageUrl && !f.isBlank)?.imageUrl ?? null;
    return {
      id: project.id,
      name: project.name,
      fps: project.fps,
      width: project.width,
      height: project.height,
      animations: project.animations,
      savedAt: Date.now(),
      thumbnailUrl: thumbnail,
      frameCount: allFrames.length,
    };
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  getSelectedAnimation: () => {
    const { animations, selectedAnimationId } = get().project;
    return animations.find((a) => a.id === selectedAnimationId) ?? null;
  },

  getSelectedFrame: () => {
    const { selectedFrameId } = get().project;
    const frames = getActiveFrames(get().project);
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  },

  getFrameById: (id) => {
    return getActiveFrames(get().project).find((f) => f.id === id);
  },

  getCurrentFrames: () => {
    return getActiveFrames(get().project);
  },
}));
