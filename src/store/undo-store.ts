import { create } from "zustand";
import { useAnimationStore } from "./animation-store";
import type { AnimationProject } from "@/types/animation";

const MAX_HISTORY = 50;

interface UndoStore {
  pastStates: AnimationProject[];
  futureStates: AnimationProject[];
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

let skipTracking = false;

export const useUndoStore = create<UndoStore>((set, get) => ({
  pastStates: [],
  futureStates: [],

  undo: () => {
    const { pastStates, futureStates } = get();
    if (pastStates.length === 0) return;

    const previous = pastStates[pastStates.length - 1];
    const currentProject = useAnimationStore.getState().project;

    skipTracking = true;
    set({
      pastStates: pastStates.slice(0, -1),
      futureStates: [currentProject, ...futureStates],
    });
    useAnimationStore.setState({
      project: previous,
      playback: { isPlaying: false, currentFrameIndex: 0 },
    });
    skipTracking = false;
  },

  redo: () => {
    const { pastStates, futureStates } = get();
    if (futureStates.length === 0) return;

    const next = futureStates[0];
    const currentProject = useAnimationStore.getState().project;

    skipTracking = true;
    set({
      pastStates: [...pastStates, currentProject],
      futureStates: futureStates.slice(1),
    });
    useAnimationStore.setState({
      project: next,
      playback: { isPlaying: false, currentFrameIndex: 0 },
    });
    skipTracking = false;
  },

  clearHistory: () => set({ pastStates: [], futureStates: [] }),
}));

// ── Auto-track animation store changes ────────────────────────────────────────

let lastProjectId = useAnimationStore.getState().project.id;

useAnimationStore.subscribe((state, prevState) => {
  if (skipTracking) return;
  if (state.project === prevState.project) return;

  // Project ID changed (new / load) → clear history, don't record old project
  if (state.project.id !== lastProjectId) {
    lastProjectId = state.project.id;
    useUndoStore.setState({ pastStates: [], futureStates: [] });
    return;
  }

  // Skip selection-only changes (no data mutation)
  if (
    state.project.animations === prevState.project.animations &&
    state.project.name === prevState.project.name &&
    state.project.fps === prevState.project.fps &&
    state.project.width === prevState.project.width &&
    state.project.height === prevState.project.height
  ) {
    return;
  }

  useUndoStore.setState((s) => ({
    pastStates: [...s.pastStates, prevState.project].slice(-MAX_HISTORY),
    futureStates: [],
  }));
});
