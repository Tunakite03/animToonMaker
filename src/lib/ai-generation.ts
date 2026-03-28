import type { AIProvider } from "@/store/settings-store"

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  fal: "fal.ai",
  replicate: "Replicate",
  openai: "OpenAI",
  stability: "Stability",
  together: "Together",
  gemini: "Gemini",
  placeholder: "No AI",
}

export function getProviderLabel(provider: AIProvider | string) {
  return PROVIDER_LABELS[provider as AIProvider] ?? provider
}

export function getMotionStrengthProfile(strength: number) {
  const normalized = Math.min(0.95, Math.max(0.05, strength))

  if (normalized <= 0.25) {
    return {
      label: "Subtle",
      description: "Keeps the next frame very close to the previous one.",
    }
  }

  if (normalized <= 0.55) {
    return {
      label: "Balanced",
      description: "Allows visible motion while keeping the scene stable.",
    }
  }

  return {
    label: "Strong",
    description: "Allows larger motion jumps and a looser continuity lock.",
  }
}
