import { useCallback, useRef, useState } from "react"
import type { Frame } from "@/types/animation"
import { useAnimationStore } from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import {
  generateFrame as generateFrameService,
  getFrameGenerationCapabilities,
} from "@/services/generate-frame"
import {
  getImageFrameDataUrl,
  saveImageSourceAsAsset,
} from "@/lib/image-assets"
import { buildFrameMotionGuidance } from "@/lib/keypoint-guidance"
import { getErrorMessage, isAbortError } from "@/lib/error-message"

/**
 * Derive a deterministic seed from a string (e.g. animation ID).
 * Keeps the random starting point consistent across frames in the
 * same animation so text-only providers produce more coherent results.
 */
function hashToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 2147483647
}

interface FrameGenerationExecutionResult {
  success: boolean
  cancelled: boolean
}

function hasUsableFrameImage(frame: Frame) {
  return Boolean(frame.imageAssetId || frame.imageUrl) && !frame.isBlank
}

export function useFrameGenerator() {
  const updateFrame = useAnimationStore((s) => s.updateFrame)
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())
  const abortControllerRef = useRef<Map<string, AbortController>>(new Map())

  const resolveReferenceFrame = useCallback(async (frameId: string) => {
    const { aiProvider, aiModel } = useSettingsStore.getState()
    const capabilities = getFrameGenerationCapabilities(
      aiProvider,
      aiModel || undefined
    )
    if (!capabilities.supportsReferenceFrame) {
      return null
    }

    const frames = useAnimationStore.getState().getCurrentFrames()
    const currentIndex = frames.findIndex((frame) => frame.id === frameId)
    if (currentIndex <= 0) {
      return null
    }

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const previousFrame = frames[index]
      if (
        !hasUsableFrameImage(previousFrame) ||
        previousFrame.continuityStale
      ) {
        continue
      }

      const dataUrl = await getImageFrameDataUrl({
        assetId: previousFrame.imageAssetId,
        imageUrl: previousFrame.imageUrl,
      })
      if (!dataUrl) {
        continue
      }

      return {
        frameId: previousFrame.id,
        dataUrl,
      }
    }

    return null
  }, [])

  const executeFrameGeneration = useCallback(
    async (
      frameId: string,
      prompt: string
    ): Promise<FrameGenerationExecutionResult> => {
      const controller = new AbortController()
      abortControllerRef.current.set(frameId, controller)

      setGeneratingIds((prev) => new Set(prev).add(frameId))
      updateFrame(frameId, {
        status: "generating",
        errorMessage: undefined,
        continuityStale: false,
      })

      const {
        aiProvider,
        apiKey,
        aiModel,
        canvasWidth,
        canvasHeight,
        styleSuffix,
        negativePrompt,
        motionStrength,
        sceneDescription,
      } = useSettingsStore.getState()

      try {
        const frames = useAnimationStore.getState().getCurrentFrames()
        const animationId =
          useAnimationStore.getState().project.selectedAnimationId
        const currentIndex = frames.findIndex((frame) => frame.id === frameId)
        const currentFrame = currentIndex >= 0 ? frames[currentIndex] : null
        const previousTimelineFrame =
          currentIndex > 0 ? frames[currentIndex - 1] : null
        const motionGuidance = buildFrameMotionGuidance(
          currentFrame,
          previousTimelineFrame
        )
        const reference = await resolveReferenceFrame(frameId)
        const data = await generateFrameService(
          {
            prompt,
            width: canvasWidth,
            height: canvasHeight,
            provider: aiProvider,
            apiKey: apiKey || undefined,
            model: aiModel || undefined,
            styleSuffix,
            negativePrompt,
            initImage: reference?.dataUrl,
            strength: reference ? motionStrength : undefined,
            motionGuidance: motionGuidance?.text,
            previousFramePrompt:
              previousTimelineFrame?.prompt?.trim() || undefined,
            frameIndex: currentIndex >= 0 ? currentIndex : undefined,
            totalFrames: frames.length,
            sceneDescription: sceneDescription || undefined,
            seed: animationId ? hashToSeed(animationId) : undefined,
          },
          controller.signal
        )
        const asset = await saveImageSourceAsAsset(data.imageUrl)

        updateFrame(frameId, {
          imageAssetId: asset.assetId,
          imageUrl: asset.imageUrl,
          status: "done",
          isBlank: false,
          errorMessage: undefined,
          continuitySourceFrameId: data.usedReferenceImage
            ? (reference?.frameId ?? null)
            : null,
          continuityStale: false,
        })

        return { success: true, cancelled: false }
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return { success: false, cancelled: true }
        }

        const message = getErrorMessage(err, "Failed to generate frame")
        updateFrame(frameId, { status: "error", errorMessage: message })
        return { success: false, cancelled: false }
      } finally {
        abortControllerRef.current.delete(frameId)
        setGeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(frameId)
          return next
        })
      }
    },
    [resolveReferenceFrame, updateFrame]
  )

  const generateFrame = useCallback(
    async (frameId: string, prompt: string) => {
      await executeFrameGeneration(frameId, prompt)
    },
    [executeFrameGeneration]
  )

  const generateBatch = useCallback(
    async (frames: { id: string; prompt: string }[]) => {
      for (const frame of frames) {
        if (!frame.prompt.trim()) continue

        const result = await executeFrameGeneration(frame.id, frame.prompt)
        if (!result.success) {
          break
        }
      }
    },
    [executeFrameGeneration]
  )

  const cancelGeneration = useCallback(
    (frameId: string) => {
      const controller = abortControllerRef.current.get(frameId)
      if (controller) {
        controller.abort()
        abortControllerRef.current.delete(frameId)
      }
      updateFrame(frameId, { status: "idle" })
      setGeneratingIds((prev) => {
        const next = new Set(prev)
        next.delete(frameId)
        return next
      })
    },
    [updateFrame]
  )

  return {
    generateFrame,
    generateBatch,
    cancelGeneration,
    generatingIds,
    isGenerating: generatingIds.size > 0,
  }
}
