"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STYLE_SUFFIX } from "@/lib/constants";

export type CanvasQuality = "low" | "medium" | "high";
export type ExportFormat = "gif" | "webm";
export type AIProvider = "fal" | "replicate" | "openai" | "stability" | "together" | "gemini" | "placeholder";

interface SettingsState {
  // Canvas
  canvasWidth: number;
  canvasHeight: number;
  canvasBackground: string;
  canvasQuality: CanvasQuality;
  showGrid: boolean;

  // AI Provider
  aiProvider: AIProvider;
  apiKey: string; // computed: returns apiKeys[aiProvider] ?? ""
  apiKeys: Partial<Record<AIProvider, string>>;
  aiModel: string;
  aiModels: Partial<Record<AIProvider, string>>;

  // AI Generation
  styleSuffix: string;
  negativePrompt: string;
  autoGenerate: boolean;

  // Export
  exportFormat: ExportFormat;
  exportQuality: number; // 1-100
  exportScale: number; // 1x, 2x

  // UI
  showOnionSkin: boolean;
  onionSkinOpacity: number;
  timelineThumbnailSize: number; // px

  // Actions
  setCanvasWidth: (w: number) => void;
  setCanvasHeight: (h: number) => void;
  setCanvasBackground: (bg: string) => void;
  setCanvasQuality: (q: CanvasQuality) => void;
  setShowGrid: (v: boolean) => void;
  setAIProvider: (p: AIProvider) => void;
  setApiKey: (k: string) => void;
  setApiKeyFor: (provider: AIProvider, k: string) => void;
  setAIModel: (m: string) => void;
  setAIModelFor: (provider: AIProvider, m: string) => void;
  setStyleSuffix: (s: string) => void;
  setNegativePrompt: (s: string) => void;
  setAutoGenerate: (v: boolean) => void;
  setExportFormat: (f: ExportFormat) => void;
  setExportQuality: (q: number) => void;
  setExportScale: (s: number) => void;
  setShowOnionSkin: (v: boolean) => void;
  setOnionSkinOpacity: (o: number) => void;
  setTimelineThumbnailSize: (s: number) => void;
  resetToDefaults: () => void;
}

const defaults = {
  canvasWidth: 512,
  canvasHeight: 512,
  canvasBackground: "#1a1a2e",
  canvasQuality: "medium" as CanvasQuality,
  showGrid: false,
  aiProvider: "placeholder" as AIProvider,
  apiKey: "",
  apiKeys: {} as Partial<Record<AIProvider, string>>,
  aiModel: "",
  aiModels: {} as Partial<Record<AIProvider, string>>,
  styleSuffix: STYLE_SUFFIX,
  negativePrompt: "",
  autoGenerate: false,
  exportFormat: "gif" as ExportFormat,
  exportQuality: 80,
  exportScale: 1,
  showOnionSkin: false,
  onionSkinOpacity: 30,
  timelineThumbnailSize: 72,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setCanvasWidth: (canvasWidth) => set({ canvasWidth }),
      setCanvasHeight: (canvasHeight) => set({ canvasHeight }),
      setCanvasBackground: (canvasBackground) => set({ canvasBackground }),
      setCanvasQuality: (canvasQuality) => set({ canvasQuality }),
      setShowGrid: (showGrid) => set({ showGrid }),
      setAIProvider: (aiProvider) =>
        set((s) => ({
          aiProvider,
          apiKey: s.apiKeys[aiProvider] ?? "",
          aiModel: s.aiModels[aiProvider] ?? "",
        })),
      setApiKey: (apiKey) =>
        set((s) => ({
          apiKey,
          apiKeys: { ...s.apiKeys, [s.aiProvider]: apiKey },
        })),
      setApiKeyFor: (provider, apiKey) =>
        set((s) => ({
          apiKeys: { ...s.apiKeys, [provider]: apiKey },
          ...(s.aiProvider === provider ? { apiKey } : {}),
        })),
      setAIModel: (aiModel) =>
        set((s) => ({
          aiModel,
          aiModels: { ...s.aiModels, [s.aiProvider]: aiModel },
        })),
      setAIModelFor: (provider, aiModel) =>
        set((s) => ({
          aiModels: { ...s.aiModels, [provider]: aiModel },
          ...(s.aiProvider === provider ? { aiModel } : {}),
        })),
      setStyleSuffix: (styleSuffix) => set({ styleSuffix }),
      setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
      setAutoGenerate: (autoGenerate) => set({ autoGenerate }),
      setExportFormat: (exportFormat) => set({ exportFormat }),
      setExportQuality: (exportQuality) => set({ exportQuality }),
      setExportScale: (exportScale) => set({ exportScale }),
      setShowOnionSkin: (showOnionSkin) => set({ showOnionSkin }),
      setOnionSkinOpacity: (onionSkinOpacity) => set({ onionSkinOpacity }),
      setTimelineThumbnailSize: (timelineThumbnailSize) =>
        set({ timelineThumbnailSize }),
      resetToDefaults: () => set(defaults),
    }),
    {
      name: "animtoon-settings",
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { resetToDefaults, ...rest } = state;
        // Strip all function keys
        return Object.fromEntries(
          Object.entries(rest).filter(([, v]) => typeof v !== "function"),
        );
      },
    },
  ),
);
