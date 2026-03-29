import { useCallback, useRef, useState } from "react"
import { useAnimationStore } from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import { getImageFrameDataUrl } from "@/lib/image-assets"
import {
  describeImage,
  isVisionCapableProvider,
} from "@/services/describe-image"
import { getErrorMessage, isAbortError } from "@/lib/error-message"

export function useImageDescriber() {
  const [isDescribing, setIsDescribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Resolve the best vision-capable provider + API key.
   *
   * Prefers the currently selected provider when it supports vision.
   * Otherwise falls back to Gemini → OpenAI (whichever has a key).
   */
  const resolveVisionProvider = useCallback((): {
    provider: string
    apiKey: string
  } | null => {
    const { aiProvider, apiKey, apiKeys } = useSettingsStore.getState()

    if (isVisionCapableProvider(aiProvider) && apiKey) {
      return { provider: aiProvider, apiKey }
    }

    // Fallback chain: gemini → openai
    if (apiKeys.gemini) {
      return { provider: "gemini", apiKey: apiKeys.gemini }
    }
    if (apiKeys.openai) {
      return { provider: "openai", apiKey: apiKeys.openai }
    }

    return null
  }, [])

  /**
   * Describe an image given its data URL.
   * Returns the description text, or `null` on failure.
   */
  const describeImageDataUrl = useCallback(
    async (dataUrl: string): Promise<string | null> => {
      const resolved = resolveVisionProvider()
      if (!resolved) {
        setError(
          "Image description requires a Gemini or OpenAI API key. " +
            "Add one in Settings → Provider."
        )
        return null
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsDescribing(true)
      setError(null)

      try {
        const result = await describeImage(
          {
            imageDataUrl: dataUrl,
            provider: resolved.provider,
            apiKey: resolved.apiKey,
          },
          controller.signal
        )
        return result.description
      } catch (err: unknown) {
        if (isAbortError(err)) return null
        const msg = getErrorMessage(err, "Failed to describe image")
        setError(msg)
        return null
      } finally {
        setIsDescribing(false)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [resolveVisionProvider]
  )

  /**
   * Convenience: describe the currently selected frame's image.
   * Returns the description text, or `null` if no frame/image is available.
   */
  const describeCurrentFrame = useCallback(async (): Promise<string | null> => {
    const frame = useAnimationStore.getState().getSelectedFrame()
    if (!frame) {
      setError("No frame selected")
      return null
    }

    const dataUrl = await getImageFrameDataUrl({
      assetId: frame.imageAssetId,
      imageUrl: frame.imageUrl,
    })

    if (!dataUrl) {
      setError("The selected frame has no image — generate or import one first")
      return null
    }

    return describeImageDataUrl(dataUrl)
  }, [describeImageDataUrl])

  /**
   * Abort any in-flight describe request.
   */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsDescribing(false)
  }, [])

  /**
   * Whether at least one vision-capable provider has a key configured.
   */
  const hasVisionProvider = useCallback((): boolean => {
    return resolveVisionProvider() !== null
  }, [resolveVisionProvider])

  return {
    describeCurrentFrame,
    describeImageDataUrl,
    isDescribing,
    error,
    cancel,
    hasVisionProvider,
  }
}
