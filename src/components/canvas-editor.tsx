import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { nanoid } from "nanoid"
import { useShallow } from "zustand/react/shallow"
import {
  selectActiveAnimation,
  selectActiveFrame,
  selectActiveFrames,
  useAnimationStore,
} from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import { AnimationPlayer } from "@/components/animation-player"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { FrameKeypoint } from "@/types/animation"
import {
  buildFrameMotionGuidance,
  describeKeypointRegion,
  getDefaultKeypointColor,
  getDefaultKeypointLabel,
} from "@/lib/keypoint-guidance"
import {
  createSolidColorImage,
  flipImage,
  removeBackground,
  rotateImage,
} from "@/lib/image-utils"
import { saveImageSourceAsAsset } from "@/lib/image-assets"
import { readImageFile, readImagePath } from "@/lib/import-utils"
import { MIN_FPS, MAX_FPS } from "@/lib/constants"
import {
  EraserIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  ImportIcon,
  LoaderIcon,
  PaintBucket,
  PaintBucketIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RepeatIcon,
  RotateCcwIcon,
  RotateCwIcon,
  TargetIcon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const ZOOM_STEP = 0.1
const DEFAULT_ZOOM = 1
const BLANK_FRAME_QUICK_COLORS = [
  "#f8fafc",
  "#fed7aa",
  "#fca5a5",
  "#fde68a",
  "#86efac",
  "#7dd3fc",
  "#c4b5fd",
  "#f9a8d4",
]

const TOOLBAR_ICON_CLASS = "h-4 w-4 shrink-0"
const TOOLBAR_BUTTON_CLASS =
  "h-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[11px] font-medium"
const TOOLBAR_ICON_BUTTON_CLASS =
  "h-7 w-7 rounded-[min(var(--radius-md),12px)] p-0 text-muted-foreground hover:text-foreground"

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function clampNormalized(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function CanvasEditor() {
  // ── Frame / playback state ──────────────────────────────────────────────────
  const selectedFrame = useAnimationStore(selectActiveFrame)
  const frames = useAnimationStore(selectActiveFrames)
  const {
    isPlaying,
    fps,
    loop,
    selectedAnimationId,
    projectWidth,
    projectHeight,
    currentFrameIndex,
    updateFrame,
    setFps,
    updateAnimationProperty,
    setPlaying,
    setCurrentFrameIndex,
  } = useAnimationStore(
    useShallow((s) => ({
      isPlaying: s.playback.isPlaying,
      fps: s.project.fps,
      loop: selectActiveAnimation(s)?.loop ?? false,
      selectedAnimationId: s.project.selectedAnimationId,
      projectWidth: s.project.width,
      projectHeight: s.project.height,
      currentFrameIndex: s.playback.currentFrameIndex,
      updateFrame: s.updateFrame,
      setFps: s.setFps,
      updateAnimationProperty: s.updateAnimationProperty,
      setPlaying: s.setPlaying,
      setCurrentFrameIndex: s.setCurrentFrameIndex,
    }))
  )
  const showOnionSkin = useSettingsStore((s) => s.showOnionSkin)
  const onionSkinOpacity = useSettingsStore((s) => s.onionSkinOpacity)

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [blankFrameFillColor, setBlankFrameFillColor] = useState("#f8fafc")
  const [isCanvasImageDragOver, setIsCanvasImageDragOver] = useState(false)
  const canvasViewportRef = useRef<HTMLElement>(null)
  const blankFrameInputRef = useRef<HTMLInputElement>(null)
  const keypointOverlayRef = useRef<HTMLDivElement>(null)
  const [isAwaitingKeypointPlacement, setIsAwaitingKeypointPlacement] =
    useState(false)
  const [activeKeypointId, setActiveKeypointId] = useState<string | null>(null)
  const [isMotionPinsPopoverOpen, setIsMotionPinsPopoverOpen] = useState(false)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasImage = Boolean(
    selectedFrame?.imageUrl || selectedFrame?.imageAssetId
  )
  const showFrameActions = !isPlaying && Boolean(selectedFrame)
  const showTools = showFrameActions && hasImage && !selectedFrame?.isBlank
  const showMotionPinTools = showFrameActions && Boolean(selectedFrame)
  const selectedFrameIndex = selectedFrame
    ? frames.findIndex((frame) => frame.id === selectedFrame.id)
    : -1
  const previousFrame =
    selectedFrameIndex > 0 ? (frames[selectedFrameIndex - 1] ?? null) : null
  const selectedKeypoints = selectedFrame?.keypoints ?? []
  const motionGuidance = buildFrameMotionGuidance(selectedFrame, previousFrame)

  const playableFrames = frames.filter((f) => f.imageUrl)
  const playableCount = playableFrames.length
  const currentDisplay = Math.min(
    currentFrameIndex + 1,
    Math.max(1, playableCount)
  )
  const onionSkinImageUrl = useMemo(() => {
    if (!showOnionSkin || isPlaying || playableFrames.length < 2) return null

    if (selectedFrame) {
      const selectedIndex = frames.findIndex(
        (frame) => frame.id === selectedFrame.id
      )
      for (let index = selectedIndex - 1; index >= 0; index -= 1) {
        if (frames[index]?.imageUrl) {
          return frames[index].imageUrl
        }
      }
    }

    if (currentFrameIndex > 0) {
      return playableFrames[currentFrameIndex - 1]?.imageUrl ?? null
    }

    return null
  }, [
    currentFrameIndex,
    frames,
    isPlaying,
    playableFrames,
    selectedFrame,
    showOnionSkin,
  ])
  const zoomPercent = Math.round(zoom * 100)

  // ── Playback handlers ───────────────────────────────────────────────────────
  const handlePlay = () => {
    if (isPlaying) {
      setPlaying(false)
      return
    }

    // Start playback from the currently selected playable frame.
    // If selected frame has no image, fall back to first playable frame.
    const selectedPlayableIndex = selectedFrame
      ? playableFrames.findIndex((f) => f.id === selectedFrame.id)
      : -1

    setCurrentFrameIndex(selectedPlayableIndex >= 0 ? selectedPlayableIndex : 0)
    setPlaying(true)
  }

  // ── Image transform handlers ────────────────────────────────────────────────
  const handleRotate = useCallback(
    async (degrees: 90 | -90) => {
      if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing)
        return
      setIsProcessing(true)
      try {
        const result = await rotateImage(selectedFrame.imageUrl, degrees)
        const asset = await saveImageSourceAsAsset(result)
        updateFrame(selectedFrame.id, {
          imageAssetId: asset.assetId,
          imageUrl: asset.imageUrl,
          isBlank: false,
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [selectedFrame, updateFrame, isProcessing]
  )

  const handleFlip = useCallback(
    async (horizontal: boolean) => {
      if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing)
        return
      setIsProcessing(true)
      try {
        const result = await flipImage(selectedFrame.imageUrl, horizontal)
        const asset = await saveImageSourceAsAsset(result)
        updateFrame(selectedFrame.id, {
          imageAssetId: asset.assetId,
          imageUrl: asset.imageUrl,
          isBlank: false,
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [selectedFrame, updateFrame, isProcessing]
  )

  const handleRemoveBg = useCallback(async () => {
    if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing)
      return
    setIsProcessing(true)
    try {
      const result = await removeBackground(selectedFrame.imageUrl)
      const asset = await saveImageSourceAsAsset(result)
      updateFrame(selectedFrame.id, {
        imageAssetId: asset.assetId,
        imageUrl: asset.imageUrl,
        isBlank: false,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [selectedFrame, updateFrame, isProcessing])

  // ── Keypoint handlers ───────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setZoom((current) => clampZoom(current + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((current) => clampZoom(current - ZOOM_STEP))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM)
  }, [])

  const commitKeypoints = useCallback(
    (nextKeypoints: FrameKeypoint[]) => {
      if (!selectedFrame) return

      updateFrame(selectedFrame.id, {
        keypoints: nextKeypoints.length > 0 ? nextKeypoints : undefined,
      })
    },
    [selectedFrame, updateFrame]
  )

  const getNormalizedCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = keypointOverlayRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) {
        return null
      }

      return {
        x: clampNormalized((clientX - rect.left) / rect.width),
        y: clampNormalized((clientY - rect.top) / rect.height),
      }
    },
    []
  )

  const handleBeginKeypointPlacement = useCallback(() => {
    if (!selectedFrame) return
    setIsAwaitingKeypointPlacement(true)
    setActiveKeypointId(null)
    setIsMotionPinsPopoverOpen(false)
  }, [selectedFrame])

  const handleCanvasKeypointPlacement = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedFrame || !isAwaitingKeypointPlacement) return

      const point = getNormalizedCanvasPoint(event.clientX, event.clientY)
      if (!point) return

      const nextIndex = selectedKeypoints.length
      const nextKeypoint: FrameKeypoint = {
        id: nanoid(),
        x: point.x,
        y: point.y,
        label: getDefaultKeypointLabel(nextIndex),
        color: getDefaultKeypointColor(nextIndex),
      }

      commitKeypoints([...selectedKeypoints, nextKeypoint])
      setActiveKeypointId(nextKeypoint.id)
      setIsAwaitingKeypointPlacement(false)
    },
    [
      commitKeypoints,
      getNormalizedCanvasPoint,
      isAwaitingKeypointPlacement,
      selectedFrame,
      selectedKeypoints,
    ]
  )

  const updateKeypointPosition = useCallback(
    (keypointId: string, clientX: number, clientY: number) => {
      const point = getNormalizedCanvasPoint(clientX, clientY)
      if (!point) return

      commitKeypoints(
        selectedKeypoints.map((keypoint) =>
          keypoint.id === keypointId
            ? { ...keypoint, x: point.x, y: point.y }
            : keypoint
        )
      )
    },
    [commitKeypoints, getNormalizedCanvasPoint, selectedKeypoints]
  )

  const handleKeypointPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, keypointId: string) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      setActiveKeypointId(keypointId)
      updateKeypointPosition(keypointId, event.clientX, event.clientY)
    },
    [updateKeypointPosition]
  )

  const handleKeypointPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, keypointId: string) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      event.preventDefault()
      event.stopPropagation()
      updateKeypointPosition(keypointId, event.clientX, event.clientY)
    },
    [updateKeypointPosition]
  )

  const handleKeypointPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    []
  )

  const handleKeypointLabelChange = useCallback(
    (keypointId: string, label: string) => {
      commitKeypoints(
        selectedKeypoints.map((keypoint) =>
          keypoint.id === keypointId ? { ...keypoint, label } : keypoint
        )
      )
    },
    [commitKeypoints, selectedKeypoints]
  )

  const handleRemoveKeypoint = useCallback(
    (keypointId: string) => {
      commitKeypoints(
        selectedKeypoints.filter((keypoint) => keypoint.id !== keypointId)
      )
      setActiveKeypointId((current) =>
        current === keypointId ? null : current
      )
    },
    [commitKeypoints, selectedKeypoints]
  )

  const handleCopyPreviousKeypoints = useCallback(() => {
    if (!previousFrame?.keypoints?.length) return

    const copiedKeypoints = previousFrame.keypoints.map((keypoint, index) => ({
      ...keypoint,
      id: nanoid(),
      color: keypoint.color || getDefaultKeypointColor(index),
    }))

    commitKeypoints(copiedKeypoints)
    setActiveKeypointId(copiedKeypoints[0]?.id ?? null)
    setIsAwaitingKeypointPlacement(false)
  }, [commitKeypoints, previousFrame])

  const handleClearKeypoints = useCallback(() => {
    commitKeypoints([])
    setActiveKeypointId(null)
    setIsAwaitingKeypointPlacement(false)
  }, [commitKeypoints])

  const applyImportedImageToSelectedFrame = useCallback(
    async (files: File[]) => {
      if (!selectedFrame) return

      const firstImageFile = files.find((file) =>
        file.type.startsWith("image/")
      )
      if (!firstImageFile) return

      const imported = await readImageFile(firstImageFile)
      if (!imported) return

      updateFrame(selectedFrame.id, {
        imageAssetId: imported.imageAssetId,
        imageUrl: imported.imageUrl,
        prompt: selectedFrame.prompt.trim()
          ? selectedFrame.prompt
          : imported.prompt,
        status: "done",
        errorMessage: undefined,
        isBlank: false,
      })
    },
    [selectedFrame, updateFrame]
  )

  const handleBlankFrameInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (!fileList || fileList.length === 0) return

      await applyImportedImageToSelectedFrame(Array.from(fileList))
      event.target.value = ""
    },
    [applyImportedImageToSelectedFrame]
  )

  const handleBlankFrameFill = useCallback(async () => {
    if (!selectedFrame) return

    const imageUrl = createSolidColorImage(
      blankFrameFillColor,
      projectWidth,
      projectHeight
    )
    const asset = await saveImageSourceAsAsset(imageUrl)

    updateFrame(selectedFrame.id, {
      imageAssetId: asset.assetId,
      imageUrl: asset.imageUrl,
      status: "done",
      errorMessage: undefined,
      isBlank: false,
    })
  }, [
    blankFrameFillColor,
    projectHeight,
    projectWidth,
    selectedFrame,
    updateFrame,
  ])

  const handleCanvasImageDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!showFrameActions || !event.dataTransfer.types.includes("Files"))
        return

      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setIsCanvasImageDragOver(true)
    },
    [showFrameActions]
  )

  const handleCanvasImageDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return
      setIsCanvasImageDragOver(false)
    },
    []
  )

  const handleCanvasImageDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!showFrameActions) return

      event.preventDefault()
      setIsCanvasImageDragOver(false)
      await applyImportedImageToSelectedFrame(
        Array.from(event.dataTransfer.files)
      )
    },
    [applyImportedImageToSelectedFrame, showFrameActions]
  )

  useEffect(() => {
    if (!showFrameActions) {
      setIsCanvasImageDragOver(false)
    }
  }, [showFrameActions])

  useEffect(() => {
    setIsAwaitingKeypointPlacement(false)
    setActiveKeypointId(null)
    setIsMotionPinsPopoverOpen(false)
  }, [selectedFrame?.id])

  // ── Tauri OS file-drop handler ──────────────────────────────────────────────
  // In Tauri v2, WebView2 intercepts OS file drops at the native level before
  // HTML5 drag events fire. We use the official Tauri webview API to handle
  // them, keeping the HTML5 handlers as a fallback for browser dev mode.
  //
  // IMPORTANT: only the `enter` and `drop` events carry `paths`; `over` events
  // only have `position`. We track whether the dragged files contain images
  // via a ref set on `enter` and cleared on `leave`/`drop`.
  const tauriDragHasImages = useRef(false)

  useEffect(() => {
    const isTauriEnv =
      typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    if (!isTauriEnv) return

    let canceled = false
    let unlistenFn: (() => void) | null = null

    ;(async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview")
        if (canceled) return

        unlistenFn = await getCurrentWebview().onDragDropEvent(
          async (event) => {
            const payload = event.payload as {
              type: "enter" | "over" | "drop" | "leave"
              paths?: string[]
              position?: { x: number; y: number }
            }

            // Only proceed when a frame is selected and not playing
            const { project, playback } = useAnimationStore.getState()
            const anim = project.animations.find(
              (a) => a.id === project.selectedAnimationId
            )
            const frame = (anim?.frames ?? []).find(
              (f) => f.id === project.selectedFrameId
            )
            if (!frame || playback.isPlaying) return

            const isOverCanvas = (() => {
              const el = canvasViewportRef.current
              if (!el || !payload.position) return false
              // Tauri reports drag coordinates in physical pixels; DOM uses CSS pixels.
              const scale = window.devicePixelRatio || 1
              const rect = el.getBoundingClientRect()
              const cx = payload.position.x / scale
              const cy = payload.position.y / scale
              return (
                cx >= rect.left &&
                cx <= rect.right &&
                cy >= rect.top &&
                cy <= rect.bottom
              )
            })()

            if (payload.type === "enter") {
              // `enter` is the only event with `paths` — cache whether images exist
              tauriDragHasImages.current = (payload.paths ?? []).some((p) =>
                /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|svg)$/i.test(p)
              )
              setIsCanvasImageDragOver(
                tauriDragHasImages.current && isOverCanvas
              )
            } else if (payload.type === "over") {
              // `over` has no paths — use cached flag
              setIsCanvasImageDragOver(
                tauriDragHasImages.current && isOverCanvas
              )
            } else if (payload.type === "leave") {
              tauriDragHasImages.current = false
              setIsCanvasImageDragOver(false)
            } else if (payload.type === "drop") {
              tauriDragHasImages.current = false
              setIsCanvasImageDragOver(false)
              if (!isOverCanvas) return

              const paths = payload.paths ?? []
              const imagePath = paths.find((p) =>
                /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|svg)$/i.test(p)
              )
              if (!imagePath) return

              const imported = await readImagePath(imagePath)
              if (!imported) return

              const { updateFrame } = useAnimationStore.getState()
              updateFrame(frame.id, {
                imageAssetId: imported.imageAssetId,
                imageUrl: imported.imageUrl,
                prompt: frame.prompt.trim() ? frame.prompt : imported.prompt,
                status: "done",
                errorMessage: undefined,
                isBlank: false,
              })
            }
          }
        )
      } catch (err) {
        console.error("[CanvasEditor] Tauri drag-drop setup failed:", err)
      }
    })()

    return () => {
      canceled = true
      unlistenFn?.()
    }
  }, [])

  useEffect(() => {
    const element = canvasViewportRef.current
    if (!element) return

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return

      event.preventDefault()
      setZoom((current) =>
        clampZoom(current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))
      )
    }

    element.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      element.removeEventListener("wheel", handleWheel)
    }
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Unified toolbar (always visible) ───────────────────────── */}
      <div className="flex h-10 shrink-0 items-center border-b border-border/50 bg-card/90 px-3 backdrop-blur-sm">
        {/* LEFT: Image edit tools — only when a frame with an image is selected */}
        {showFrameActions && (
          <div className="mr-1 flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => blankFrameInputRef.current?.click()}
                  className={cn(
                    TOOLBAR_ICON_BUTTON_CLASS,
                    "transition-colors",
                    isCanvasImageDragOver
                      ? "bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary"
                      : ""
                  )}
                >
                  <ImportIcon
                    className={cn(TOOLBAR_ICON_CLASS, "text-current")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {selectedFrame?.isBlank
                  ? "Click here or drag an image into the canvas to fill this frame"
                  : "Click here or drag an image into the canvas to replace this frame"}
              </TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={TOOLBAR_ICON_BUTTON_CLASS}
                    >
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <PaintBucketIcon className="h-4 w-4 text-current" />
                        <span
                          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-black/80 shadow-sm"
                          style={{ backgroundColor: blankFrameFillColor }}
                        />
                      </span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Replace the selected frame with a solid color
                </TooltipContent>
              </Tooltip>

              <PopoverContent
                align="start"
                side="bottom"
                className="w-80 rounded-2xl border border-border/70 bg-background/96 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
              >
                <PopoverHeader className="gap-1">
                  <PopoverTitle className="text-sm font-semibold text-foreground">
                    Frame fill
                  </PopoverTitle>
                  <PopoverDescription className="text-xs leading-relaxed">
                    Paint the selected frame with a solid color. This works for
                    blank placeholders and existing frames.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
                  <label
                    className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl border border-border/70 shadow-sm"
                    style={{ backgroundColor: blankFrameFillColor }}
                  >
                    <input
                      type="color"
                      value={blankFrameFillColor}
                      onChange={(event) =>
                        setBlankFrameFillColor(event.target.value)
                      }
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Choose a fill color for the selected frame"
                    />
                  </label>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Active Color
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {blankFrameFillColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {BLANK_FRAME_QUICK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBlankFrameFillColor(color)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                        blankFrameFillColor === color
                          ? "border-foreground shadow-sm"
                          : "border-white/80"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Use ${color} as the frame fill color`}
                    />
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleBlankFrameFill}
                  className="mt-4 w-full gap-1.5"
                >
                  <PaintBucket />
                  Fill Frame
                </Button>
              </PopoverContent>
            </Popover>

            <Popover
              open={isMotionPinsPopoverOpen}
              onOpenChange={setIsMotionPinsPopoverOpen}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        TOOLBAR_BUTTON_CLASS,
                        selectedKeypoints.length > 0
                          ? "text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <TargetIcon className={TOOLBAR_ICON_CLASS} />
                      <span>Pins</span>
                      {selectedKeypoints.length > 0 ? (
                        <span className="rounded bg-sky-500/12 px-1 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-200">
                          {selectedKeypoints.length}
                        </span>
                      ) : null}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Manage motion pins without covering the canvas
                </TooltipContent>
              </Tooltip>

              <PopoverContent
                align="start"
                side="bottom"
                className="w-80 rounded-2xl border border-border/70 bg-background/96 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
              >
                <PopoverHeader className="gap-1">
                  <PopoverTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                      <TargetIcon className="h-4 w-4" />
                    </span>
                    Motion Pins
                  </PopoverTitle>
                  <PopoverDescription className="text-xs leading-relaxed">
                    Matching labels across nearby frames become motion guidance
                    for AI generation.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={
                      isAwaitingKeypointPlacement ? "default" : "outline"
                    }
                    onClick={handleBeginKeypointPlacement}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <PlusIcon className={TOOLBAR_ICON_CLASS} />
                    {isAwaitingKeypointPlacement ? "Click canvas…" : "Add pin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPreviousKeypoints}
                    disabled={!previousFrame?.keypoints?.length}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <TargetIcon className={TOOLBAR_ICON_CLASS} />
                    Copy prev
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearKeypoints}
                    disabled={selectedKeypoints.length === 0}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Trash2Icon className={TOOLBAR_ICON_CLASS} />
                    Clear
                  </Button>
                </div>

                {motionGuidance ? (
                  <div className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/6 px-3 py-2 text-[11px] leading-relaxed text-sky-950 dark:text-sky-50">
                    {motionGuidance.matchedCount > 0
                      ? `${motionGuidance.matchedCount} matched pin${motionGuidance.matchedCount === 1 ? "" : "s"} will contribute pose-change guidance for this frame.`
                      : `${motionGuidance.pinCount} pin${motionGuidance.pinCount === 1 ? "" : "s"} will anchor composition for this frame.`}
                  </div>
                ) : null}

                {selectedKeypoints.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {selectedKeypoints.map((keypoint, index) => {
                      const isActive = keypoint.id === activeKeypointId
                      return (
                        <div
                          key={keypoint.id}
                          className={cn(
                            "rounded-xl border border-border/60 bg-muted/20 px-3 py-2",
                            isActive && "border-sky-500/40 bg-sky-500/6"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{ backgroundColor: keypoint.color }}
                            />
                            <Input
                              value={keypoint.label}
                              onChange={(event) =>
                                handleKeypointLabelChange(
                                  keypoint.id,
                                  event.target.value
                                )
                              }
                              className="h-8 border-border/60 bg-background/70 text-xs"
                              placeholder={getDefaultKeypointLabel(index)}
                            />
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleRemoveKeypoint(keypoint.id)}
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="mt-2 text-[10px] text-muted-foreground">
                            Target zone:{" "}
                            {describeKeypointRegion(keypoint.x, keypoint.y)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-border/60 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
                    Add pins for landmarks like head, hands, feet, or props.
                    Then reuse the same labels on adjacent frames to steer
                    motion.
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {showTools && (
          <div className="flex items-center gap-1.5">
            {/* Mode toggle — pill */}
            {/* Transform buttons */}
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleRotate(-90)}
                    disabled={isProcessing}
                    className={TOOLBAR_ICON_BUTTON_CLASS}
                  >
                    <RotateCcwIcon className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rotate 90° left</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleRotate(90)}
                    disabled={isProcessing}
                    className={TOOLBAR_ICON_BUTTON_CLASS}
                  >
                    <RotateCwIcon className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rotate 90° right</TooltipContent>
              </Tooltip>

              <Separator
                orientation="vertical"
                className="mx-0.5 h-3.5 opacity-40"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleFlip(true)}
                    disabled={isProcessing}
                    className={TOOLBAR_ICON_BUTTON_CLASS}
                  >
                    <FlipHorizontalIcon className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Flip horizontal</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleFlip(false)}
                    disabled={isProcessing}
                    className={TOOLBAR_ICON_BUTTON_CLASS}
                  >
                    <FlipVerticalIcon className={TOOLBAR_ICON_CLASS} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Flip vertical</TooltipContent>
              </Tooltip>
            </div>

            <Separator
              orientation="vertical"
              className="mx-0.5 h-4 opacity-60"
            />

            {/* Remove BG */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveBg}
                  disabled={isProcessing}
                  className={cn(
                    TOOLBAR_BUTTON_CLASS,
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isProcessing ? (
                    <LoaderIcon className={TOOLBAR_ICON_CLASS} />
                  ) : (
                    <EraserIcon className={TOOLBAR_ICON_CLASS} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Remove background (flood fill from edges)
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* RIGHT: Playback controls + FPS — always visible, pushed to right */}
        <div className="ml-auto flex items-center gap-1">
          {/* Play / Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handlePlay}
                disabled={playableCount < 2}
                className={cn(
                  "h-7 w-7 rounded-full p-0 shadow-sm transition-all",
                  isPlaying
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 disabled:opacity-30"
                )}
              >
                {isPlaying ? (
                  <PauseIcon className={TOOLBAR_ICON_CLASS} />
                ) : (
                  <PlayIcon className={TOOLBAR_ICON_CLASS} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPlaying
                ? "Pause"
                : playableCount < 2
                  ? "Need ≥2 frames"
                  : "Play"}
            </TooltipContent>
          </Tooltip>

          {/* Loop toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => {
                  if (selectedAnimationId) {
                    updateAnimationProperty(selectedAnimationId, {
                      loop: !loop,
                    })
                  }
                }}
                className={cn(
                  "h-7 w-7 p-0 transition-colors",
                  loop
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <RepeatIcon className={TOOLBAR_ICON_CLASS} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {loop ? "Loop on" : "Loop off"}
            </TooltipContent>
          </Tooltip>

          {playableCount > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-1.5 h-4 opacity-60"
              />
              {/* Frame position counter */}
              <span className="text-[11px] text-muted-foreground tabular-nums">
                <span
                  className={cn(
                    "font-semibold",
                    isPlaying ? "text-primary" : "text-foreground/75"
                  )}
                >
                  {currentDisplay}
                </span>
                <span className="mx-0.5 opacity-40">/</span>
                {playableCount}
              </span>
            </>
          )}

          <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />

          {/* FPS slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">FPS</span>
            <Slider
              value={[fps]}
              onValueChange={([v]) => setFps(v)}
              min={MIN_FPS}
              max={MAX_FPS}
              step={1}
              className="w-20"
            />
            <span className="w-5 text-right text-[11px] font-semibold text-foreground/80 tabular-nums">
              {fps}
            </span>
          </div>
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────── */}
      <main
        ref={canvasViewportRef}
        className="flex min-h-0 flex-1 flex-col overflow-auto p-3"
      >
        <div
          className="relative flex min-h-0 flex-1"
          onDragOver={handleCanvasImageDragOver}
          onDragLeave={handleCanvasImageDragLeave}
          onDrop={handleCanvasImageDrop}
        >
          <AnimationPlayer zoom={zoom}>
            <input
              ref={blankFrameInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleBlankFrameInputChange}
            />

            {onionSkinImageUrl ? (
              <img
                src={onionSkinImageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full rounded-lg object-cover"
                style={{ opacity: onionSkinOpacity / 100 }}
              />
            ) : null}

            {isCanvasImageDragOver && showFrameActions ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/10 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-background/88 px-5 py-4 text-center shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <ImportIcon className="h-5 w-5 text-current" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      {selectedFrame?.isBlank
                        ? "Drop image to fill this frame"
                        : "Drop image to replace this frame"}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      The selected frame will update immediately.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {showMotionPinTools ? (
              <div
                ref={keypointOverlayRef}
                className="pointer-events-none absolute inset-0 z-20 rounded-lg"
              >
                {isAwaitingKeypointPlacement ? (
                  <div
                    className="pointer-events-auto absolute inset-0 cursor-crosshair rounded-lg border border-sky-500/35 bg-sky-500/6"
                    onClick={handleCanvasKeypointPlacement}
                  />
                ) : null}

                {selectedKeypoints.map((keypoint) => {
                  const isActive = keypoint.id === activeKeypointId
                  return (
                    <button
                      key={keypoint.id}
                      type="button"
                      onClick={() => setActiveKeypointId(keypoint.id)}
                      onPointerDown={(event) =>
                        handleKeypointPointerDown(event, keypoint.id)
                      }
                      onPointerMove={(event) =>
                        handleKeypointPointerMove(event, keypoint.id)
                      }
                      onPointerUp={handleKeypointPointerUp}
                      className={cn(
                        "pointer-events-auto absolute flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[8px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)] transition-transform outline-none",
                        isActive && "scale-115"
                      )}
                      style={{
                        left: `${keypoint.x * 100}%`,
                        top: `${keypoint.y * 100}%`,
                        backgroundColor: keypoint.color,
                        borderColor: isActive
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(15,23,42,0.45)",
                      }}
                      aria-label={`Motion pin ${keypoint.label}`}
                    >
                      {keypoint.label.trim().slice(0, 1).toUpperCase() || "•"}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </AnimationPlayer>

          <div className="pointer-events-none absolute top-4 right-4 z-40">
            <div className="pointer-events-auto flex items-center gap-0 rounded-md border border-border/50 bg-background/78 p-0.5 shadow-sm backdrop-blur-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={handleZoomOut}
                    disabled={zoom <= MIN_ZOOM}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ZoomOutIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Zoom out</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleZoomReset}
                    className="h-6 min-w-9 px-1.5 text-[10px] text-muted-foreground tabular-nums hover:text-foreground"
                  >
                    {zoomPercent}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset zoom</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={handleZoomIn}
                    disabled={zoom >= MAX_ZOOM}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ZoomInIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Zoom in</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
