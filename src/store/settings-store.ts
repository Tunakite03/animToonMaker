import { create } from "zustand"
import { persist } from "zustand/middleware"
import { STYLE_SUFFIX } from "@/lib/constants"
import {
  DEFAULT_SHORTCUT_BINDINGS,
  normalizeShortcut,
  type ShortcutAction,
  type ShortcutBindings,
} from "@/lib/shortcuts"

export type CanvasQuality = "low" | "medium" | "high"
export type ExportFormat = "gif" | "webm" | "frames"
export type AIProvider =
  | "fal"
  | "replicate"
  | "openai"
  | "stability"
  | "together"
  | "gemini"
  | "placeholder"

type DesktopApiKeyProvider = Exclude<AIProvider, "placeholder">

const SETTINGS_STORAGE_KEY = "animtoon-settings"
const DESKTOP_API_KEY_PROVIDERS: DesktopApiKeyProvider[] = [
  "fal",
  "replicate",
  "openai",
  "stability",
  "together",
  "gemini",
]

interface PersistedSettingsPayload {
  state?: Record<string, unknown>
  version?: number
}

interface SettingsState {
  // Canvas
  canvasWidth: number
  canvasHeight: number
  canvasBackground: string
  canvasQuality: CanvasQuality
  showGrid: boolean

  // AI Provider
  aiProvider: AIProvider
  apiKey: string // computed: returns apiKeys[aiProvider] ?? ""
  apiKeys: Partial<Record<AIProvider, string>>
  apiKeysHydrated: boolean
  aiModel: string
  aiModels: Partial<Record<AIProvider, string>>

  // AI Generation
  styleSuffix: string
  negativePrompt: string
  motionStrength: number
  sceneDescription: string

  // Export
  exportFormat: ExportFormat
  exportQuality: number // 1-100
  exportScale: number // 1x, 2x

  // UI
  showOnionSkin: boolean
  onionSkinOpacity: number
  timelineThumbnailSize: number // px
  shortcutBindings: ShortcutBindings

  // Actions
  setCanvasWidth: (w: number) => void
  setCanvasHeight: (h: number) => void
  setCanvasBackground: (bg: string) => void
  setCanvasQuality: (q: CanvasQuality) => void
  setShowGrid: (v: boolean) => void
  setAIProvider: (p: AIProvider) => void
  setApiKey: (k: string) => void
  setApiKeyFor: (provider: AIProvider, k: string) => void
  hydrateApiKeys: () => Promise<void>
  setAIModel: (m: string) => void
  setAIModelFor: (provider: AIProvider, m: string) => void
  setStyleSuffix: (s: string) => void
  setNegativePrompt: (s: string) => void
  setMotionStrength: (v: number) => void
  setSceneDescription: (s: string) => void
  setExportFormat: (f: ExportFormat) => void
  setExportQuality: (q: number) => void
  setExportScale: (s: number) => void
  setShowOnionSkin: (v: boolean) => void
  setOnionSkinOpacity: (o: number) => void
  setTimelineThumbnailSize: (s: number) => void
  setShortcutBinding: (action: ShortcutAction, shortcut: string) => void
  resetShortcutBindings: () => void
  resetToDefaults: () => void
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
  apiKeysHydrated: false,
  aiModel: "",
  aiModels: {} as Partial<Record<AIProvider, string>>,
  styleSuffix: STYLE_SUFFIX,
  negativePrompt: "",
  motionStrength: 0.4,
  sceneDescription: "",
  exportFormat: "gif" as ExportFormat,
  exportQuality: 80,
  exportScale: 1,
  showOnionSkin: false,
  onionSkinOpacity: 30,
  timelineThumbnailSize: 72,
  shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS },
}

let hydrateApiKeysPromise: Promise<void> | null = null

function isTauriDesktopRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

function isDesktopApiKeyProvider(
  provider: string
): provider is DesktopApiKeyProvider {
  return DESKTOP_API_KEY_PROVIDERS.includes(provider as DesktopApiKeyProvider)
}

function sanitizeApiKeys(raw: unknown): Partial<Record<AIProvider, string>> {
  if (!raw || typeof raw !== "object") {
    return {}
  }

  const parsed: Partial<Record<AIProvider, string>> = {}
  for (const [provider, value] of Object.entries(
    raw as Record<string, unknown>
  )) {
    if (!isDesktopApiKeyProvider(provider) || typeof value !== "string") {
      continue
    }

    const trimmed = value.trim()
    if (!trimmed) {
      continue
    }

    parsed[provider] = trimmed
  }

  return parsed
}

async function invokeTauriCommand<T>(
  command: string,
  args?: Record<string, unknown>
) {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(command, args)
}

async function persistDesktopProviderApiKey(
  provider: DesktopApiKeyProvider,
  apiKey: string
) {
  await invokeTauriCommand("set_provider_api_key", { provider, apiKey })
}

function readPersistedSettingsPayload(): PersistedSettingsPayload | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const payload = JSON.parse(raw) as PersistedSettingsPayload
    return payload && typeof payload === "object" ? payload : null
  } catch {
    return null
  }
}

function readLegacyApiKeysFromLocalStorage() {
  const payload = readPersistedSettingsPayload()
  if (!payload?.state || typeof payload.state !== "object") {
    return {}
  }

  return sanitizeApiKeys(payload.state.apiKeys)
}

function stripPersistedApiKeysFromLocalStorage() {
  if (typeof window === "undefined") {
    return
  }

  const payload = readPersistedSettingsPayload()
  if (!payload?.state || typeof payload.state !== "object") {
    return
  }

  delete payload.state.apiKeys
  delete payload.state.apiKey
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
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
      setApiKey: (apiKey) => {
        set((s) => ({
          apiKey,
          apiKeys: { ...s.apiKeys, [s.aiProvider]: apiKey },
        }))

        if (!isTauriDesktopRuntime()) {
          return
        }

        const provider = get().aiProvider
        if (!isDesktopApiKeyProvider(provider)) {
          return
        }

        void persistDesktopProviderApiKey(provider, apiKey).catch((error) => {
          console.error("Failed to persist desktop API key:", error)
        })
      },
      setApiKeyFor: (provider, apiKey) => {
        set((s) => ({
          apiKeys: { ...s.apiKeys, [provider]: apiKey },
          ...(s.aiProvider === provider ? { apiKey } : {}),
        }))

        if (!isTauriDesktopRuntime() || !isDesktopApiKeyProvider(provider)) {
          return
        }

        void persistDesktopProviderApiKey(provider, apiKey).catch((error) => {
          console.error("Failed to persist desktop API key:", error)
        })
      },
      hydrateApiKeys: async () => {
        if (get().apiKeysHydrated) {
          return
        }

        if (!isTauriDesktopRuntime()) {
          set({ apiKeysHydrated: true })
          return
        }

        if (hydrateApiKeysPromise) {
          await hydrateApiKeysPromise
          return
        }

        hydrateApiKeysPromise = (async () => {
          try {
            const legacyApiKeys = readLegacyApiKeysFromLocalStorage()
            for (const [provider, apiKey] of Object.entries(legacyApiKeys)) {
              if (!isDesktopApiKeyProvider(provider)) {
                continue
              }
              await persistDesktopProviderApiKey(provider, apiKey)
            }

            const desktopApiKeys = sanitizeApiKeys(
              await invokeTauriCommand<Record<string, string>>(
                "get_provider_api_keys"
              )
            )

            if (Object.keys(legacyApiKeys).length > 0) {
              stripPersistedApiKeysFromLocalStorage()
            }

            set((s) => ({
              apiKeys: desktopApiKeys,
              apiKey: desktopApiKeys[s.aiProvider] ?? "",
              apiKeysHydrated: true,
            }))
          } catch (error) {
            console.error("Failed to hydrate desktop API keys:", error)
            set({ apiKeysHydrated: true })
          }
        })().finally(() => {
          hydrateApiKeysPromise = null
        })

        await hydrateApiKeysPromise
      },
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
      setMotionStrength: (motionStrength) =>
        set({
          motionStrength: Math.max(0.05, Math.min(0.95, motionStrength)),
        }),
      setSceneDescription: (sceneDescription) => set({ sceneDescription }),
      setExportFormat: (exportFormat) => set({ exportFormat }),
      setExportQuality: (exportQuality) => set({ exportQuality }),
      setExportScale: (exportScale) => set({ exportScale }),
      setShowOnionSkin: (showOnionSkin) => set({ showOnionSkin }),
      setOnionSkinOpacity: (onionSkinOpacity) => set({ onionSkinOpacity }),
      setTimelineThumbnailSize: (timelineThumbnailSize) =>
        set({ timelineThumbnailSize }),
      setShortcutBinding: (action, shortcut) =>
        set((s) => ({
          shortcutBindings: {
            ...s.shortcutBindings,
            [action]: normalizeShortcut(shortcut),
          },
        })),
      resetShortcutBindings: () =>
        set({ shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS } }),
      resetToDefaults: () =>
        set({
          ...defaults,
          shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS },
        }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      partialize: (state) => {
        const persisted = Object.fromEntries(
          Object.entries(state).filter(
            ([, value]) => typeof value !== "function"
          )
        ) as Record<string, unknown>

        delete persisted.apiKeysHydrated

        if (isTauriDesktopRuntime()) {
          delete persisted.apiKey
          delete persisted.apiKeys
        }

        return persisted
      },
    }
  )
)
