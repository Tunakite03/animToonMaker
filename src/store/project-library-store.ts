import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedProject, LegacySavedProject } from "@/types/animation";

type StoredProject = SavedProject | LegacySavedProject;

interface ProjectLibraryStore {
  projects: StoredProject[];

  saveProject: (project: SavedProject) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  getProject: (id: string) => StoredProject | undefined;
}

export const useProjectLibraryStore = create<ProjectLibraryStore>()(
  persist(
    (set, get) => ({
      projects: [],

      saveProject: (project) =>
        set((s) => {
          const existing = s.projects.findIndex((p) => p.id === project.id);
          if (existing >= 0) {
            const updated = [...s.projects];
            updated[existing] = project;
            return { projects: updated };
          }
          return { projects: [project, ...s.projects] };
        }),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
        })),

      renameProject: (id, name) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name } : p,
          ),
        })),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: "animtoon-project-library",
    },
  ),
);
