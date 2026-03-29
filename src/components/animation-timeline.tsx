import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { createPortal } from "react-dom"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { selectActiveFrames, useAnimationStore } from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import { getFrameGenerationCapabilities } from "@/services/generate-frame"
import { cn } from "@/lib/utils"
import { MAX_FRAMES } from "@/lib/constants"
import {
  processImageFiles,
  processImagePaths,
  readImageFile,
  readImagePath,
} from "@/lib/import-utils"
import {
  AddFramesIcon,
  CopyFrameIcon,
  CutFrameIcon,
  DuplicateIcon,
  FilmStripIcon,
  PasteFrameIcon,
  PlusSmIcon,
  TrashFrameIcon,
} from "@/components/icons"
import { SortableFrame } from "@/components/animation-timeline/sortable-frame"
import {
  TimelineContextMenu,
  TimelineContextMenuDivider,
  TimelineContextMenuItem,
  type TimelineMenuState,
} from "@/components/animation-timeline/context-menu"

// ── Main timeline component ───────────────────────────────────────────────────

export function AnimationTimeline() {
  const frames = useAnimationStore(selectActiveFrames)
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const {
    selectedFrameId,
    isPlaying,
    currentFrameIndex,
    selectFrame,
    reorderFrames,
    removeFrame,
    updateFrame,
    addFrameWithImage,
    insertFrame,
    duplicateFrame,
    copyFrame,
    cutFrame,
    pasteFrame,
    frameClipboard,
    frameActionNotice,
    clearFrameActionNotice,
  } = useAnimationStore(
    useShallow((s) => ({
      selectedFrameId: s.project.selectedFrameId,
      isPlaying: s.playback.isPlaying,
      currentFrameIndex: s.playback.currentFrameIndex,
      selectFrame: s.selectFrame,
      reorderFrames: s.reorderFrames,
      removeFrame: s.removeFrame,
      updateFrame: s.updateFrame,
      addFrameWithImage: s.addFrameWithImage,
      insertFrame: s.insertFrame,
      duplicateFrame: s.duplicateFrame,
      copyFrame: s.copyFrame,
      cutFrame: s.cutFrame,
      pasteFrame: s.pasteFrame,
      frameClipboard: s.frameClipboard,
      frameActionNotice: s.frameActionNotice,
      clearFrameActionNotice: s.clearFrameActionNotice,
    }))
  )

  const [isDragOver, setIsDragOver] = useState(false)
  const [dropTargetFrameId, setDropTargetFrameId] = useState<string | null>(
    null
  )
  const [menuState, setMenuState] = useState<TimelineMenuState | null>(null)
  const [menuPosition, setMenuPosition] = useState<{
    left: number
    top: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const framesInputRef = useRef<HTMLInputElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Stable ref to the current frame count — readable inside async effects and
  // callbacks without making them re-subscribe on every frame addition.
  const framesCountRef = useRef(frames.length)
  framesCountRef.current = frames.length

  // Prevents the HTML5 drop handler from double-processing files that were
  // already handled by the Tauri onDragDropEvent listener.
  const isHandlingDrop = useRef(false)

  // Tracks whether the current Tauri drag contains image files.
  // Only the `enter` and `drop` events carry `paths`; `over` events do not.
  const tauriDragHasImages = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const frameIds = useMemo(() => frames.map((f) => f.id), [frames])

  const playableFrames = useMemo(
    () => frames.filter((f) => f.imageUrl),
    [frames]
  )
  const staleFrameCount = useMemo(
    () => frames.filter((frame) => frame.continuityStale).length,
    [frames]
  )
  const generationCapabilities = getFrameGenerationCapabilities(
    aiProvider,
    aiModel || undefined
  )
  const staleBadgeLabel = generationCapabilities.supportsReferenceFrame
    ? "Refresh"
    : "Stale"
  const staleSummaryLabel = generationCapabilities.supportsReferenceFrame
    ? `${staleFrameCount} need refresh`
    : `${staleFrameCount} continuity stale`
  const currentPlayableId = playableFrames[currentFrameIndex]?.id
  const hasFrameClipboard = Boolean(frameClipboard)
  const canCreateFrame = frames.length < MAX_FRAMES
  const clipboardPasteLabel =
    frameClipboard?.mode === "cut" ? "Paste cut frame" : "Paste frame"
  const frameActionNoticeMessage = frameActionNotice?.message ?? null

  useEffect(() => {
    if (!frameActionNotice) return

    const timeoutId = window.setTimeout(() => {
      const activeNotice = useAnimationStore.getState().frameActionNotice
      if (activeNotice?.id !== frameActionNotice.id) return
      clearFrameActionNotice()
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [clearFrameActionNotice, frameActionNotice])

  const frameActionNoticeBanner = frameActionNoticeMessage ? (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-1.5 left-2 z-30 rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm"
    >
      {frameActionNoticeMessage}
    </div>
  ) : null

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const from = frames.findIndex((f) => f.id === active.id)
      const to = frames.findIndex((f) => f.id === over.id)
      if (from !== -1 && to !== -1) {
        reorderFrames(from, to)
      }
    },
    [frames, reorderFrames]
  )

  const handleFramesImportChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (!fileList || fileList.length === 0) return

      await processImageFiles(
        Array.from(fileList),
        framesCountRef.current,
        addFrameWithImage
      )

      event.target.value = ""
    },
    [addFrameWithImage]
  )

  const replaceFrameImage = useCallback(
    (
      frameId: string,
      image: { imageUrl: string; imageAssetId: string },
      prompt: string
    ) => {
      const targetFrame = frames.find((frame) => frame.id === frameId)
      if (!targetFrame || !targetFrame.isBlank) return false

      updateFrame(frameId, {
        imageAssetId: image.imageAssetId,
        imageUrl: image.imageUrl,
        prompt: targetFrame.prompt.trim() ? targetFrame.prompt : prompt,
        status: "done",
        errorMessage: undefined,
        isBlank: false,
      })
      selectFrame(frameId)
      return true
    },
    [frames, selectFrame, updateFrame]
  )

  const replaceBlankFrameFromFiles = useCallback(
    async (frameId: string, files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))
      if (imageFiles.length === 0) return false

      const [firstFile, ...remainingFiles] = imageFiles
      const imported = await readImageFile(firstFile)
      if (!imported) return false

      const replaced = replaceFrameImage(
        frameId,
        {
          imageUrl: imported.imageUrl,
          imageAssetId: imported.imageAssetId,
        },
        imported.prompt
      )
      if (!replaced) return false

      if (remainingFiles.length > 0) {
        await processImageFiles(
          remainingFiles,
          framesCountRef.current,
          addFrameWithImage
        )
      }

      return true
    },
    [addFrameWithImage, replaceFrameImage]
  )

  const replaceBlankFrameFromPaths = useCallback(
    async (frameId: string, paths: string[]) => {
      if (paths.length === 0) return false

      const [firstPath, ...remainingPaths] = paths
      const imported = await readImagePath(firstPath)
      if (!imported) return false

      const replaced = replaceFrameImage(
        frameId,
        {
          imageUrl: imported.imageUrl,
          imageAssetId: imported.imageAssetId,
        },
        imported.prompt
      )
      if (!replaced) return false

      if (remainingPaths.length > 0) {
        await processImagePaths(
          remainingPaths,
          framesCountRef.current,
          addFrameWithImage
        )
      }

      return true
    },
    [addFrameWithImage, replaceFrameImage]
  )

  const getBlankFrameAtViewportPoint = useCallback(
    (position?: { x: number; y: number }) => {
      if (!position || typeof document === "undefined") return null

      // Tauri reports drag coordinates in physical pixels; DOM hit-testing uses CSS pixels.
      const scale = window.devicePixelRatio || 1
      const element = document.elementFromPoint(
        position.x / scale,
        position.y / scale
      ) as HTMLElement | null
      const frameId =
        element?.closest<HTMLElement>("[data-frame-id]")?.dataset.frameId
      if (!frameId) return null

      const frame = frames.find((candidate) => candidate.id === frameId)
      return frame?.isBlank ? frameId : null
    },
    [frames]
  )

  const closeContextMenu = useCallback(() => {
    setMenuState(null)
    setMenuPosition(null)
  }, [])

  const handleOpenContextMenu = useCallback(
    (x: number, y: number, frameId: string | null) => {
      setMenuPosition({ left: x, top: y })
      setMenuState({ x, y, frameId })
    },
    []
  )

  const handleFrameContextMenu = useCallback(
    (event: React.MouseEvent, frameId: string) => {
      event.preventDefault()
      event.stopPropagation()
      selectFrame(frameId)
      handleOpenContextMenu(event.clientX, event.clientY, frameId)
    },
    [handleOpenContextMenu, selectFrame]
  )

  const handleTimelineContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest("[data-frame-id]")) return

      event.preventDefault()
      handleOpenContextMenu(event.clientX, event.clientY, null)
    },
    [handleOpenContextMenu]
  )

  const runMenuAction = useCallback(
    (action: () => void) => {
      action()
      closeContextMenu()
    },
    [closeContextMenu]
  )

  useEffect(() => {
    if (!menuState || !menuRef.current) return

    const { width, height } = menuRef.current.getBoundingClientRect()
    const margin = 8
    setMenuPosition({
      left: Math.min(menuState.x, window.innerWidth - width - margin),
      top: Math.min(menuState.y, window.innerHeight - height - margin),
    })
  }, [menuState])

  useEffect(() => {
    if (!menuState) return

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      closeContextMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeContextMenu()
    }

    window.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", closeContextMenu, true)
    window.addEventListener("resize", closeContextMenu)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", closeContextMenu, true)
      window.removeEventListener("resize", closeContextMenu)
    }
  }, [closeContextMenu, menuState])

  // ── External image drop ────────────────────────────────────────────────────
  const handleFrameImageDragOver = useCallback(
    (event: React.DragEvent, frameId: string) => {
      const frame = frames.find((candidate) => candidate.id === frameId)
      if (
        !frame ||
        !frame.isBlank ||
        !event.dataTransfer.types.includes("Files")
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = "copy"
      setDropTargetFrameId(frameId)
      setIsDragOver(false)
    },
    [frames]
  )

  const handleFrameImageDragLeave = useCallback(
    (event: React.DragEvent, frameId: string) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return

      setDropTargetFrameId((current) => (current === frameId ? null : current))
    },
    []
  )

  const handleFrameImageDrop = useCallback(
    async (event: React.DragEvent, frameId: string) => {
      const frame = frames.find((candidate) => candidate.id === frameId)
      if (!frame || !frame.isBlank) return

      event.preventDefault()
      event.stopPropagation()
      setDropTargetFrameId(null)
      setIsDragOver(false)

      if (isHandlingDrop.current) return

      const files = Array.from(event.dataTransfer.files)
      if (files.length === 0) return

      isHandlingDrop.current = true
      try {
        const replaced = await replaceBlankFrameFromFiles(frameId, files)
        if (!replaced) {
          await processImageFiles(
            files,
            framesCountRef.current,
            addFrameWithImage
          )
        }
      } finally {
        isHandlingDrop.current = false
      }
    },
    [addFrameWithImage, frames, replaceBlankFrameFromFiles]
  )

  const handleExternalDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
      setIsDragOver(true)
    }
  }, [])

  const handleExternalDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragOver(false)
    setDropTargetFrameId(null)
  }, [])

  const handleExternalDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      setDropTargetFrameId(null)
      // In Tauri desktop mode the drop is already handled by onDragDropEvent;
      // bail out to avoid processing the same files twice.
      if (isHandlingDrop.current) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return
      isHandlingDrop.current = true
      try {
        await processImageFiles(
          files,
          framesCountRef.current,
          addFrameWithImage
        )
      } finally {
        isHandlingDrop.current = false
      }
    },
    [addFrameWithImage]
  )

  // ── Tauri OS file-drop handler ─────────────────────────────────────────────
  // In Tauri v2, WebView2/WKWebView intercepts OS file drops at the native
  // level *before* HTML5 drag events fire.  We use the official Tauri webview
  // API to handle them, keeping the HTML5 handlers as a fallback for browser
  // dev mode (pnpm dev:vite).
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

            // Check if the drag position is within the timeline area.
            const isOverTimeline = (() => {
              const el = timelineContainerRef.current
              if (!el || !payload.position) return false
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
              // `enter` is the only hover event with `paths` — cache the check
              tauriDragHasImages.current = (payload.paths ?? []).some((p) =>
                /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|svg)$/i.test(p)
              )
              if (tauriDragHasImages.current && isOverTimeline) {
                setIsDragOver(true)
                setDropTargetFrameId(
                  getBlankFrameAtViewportPoint(payload.position)
                )
              } else {
                setIsDragOver(false)
                setDropTargetFrameId(null)
              }
            } else if (payload.type === "over") {
              // `over` has no paths — use the cached flag
              if (tauriDragHasImages.current && isOverTimeline) {
                setIsDragOver(true)
                setDropTargetFrameId(
                  getBlankFrameAtViewportPoint(payload.position)
                )
              } else {
                setIsDragOver(false)
                setDropTargetFrameId(null)
              }
            } else if (payload.type === "leave") {
              tauriDragHasImages.current = false
              setIsDragOver(false)
              setDropTargetFrameId(null)
            } else if (payload.type === "drop") {
              tauriDragHasImages.current = false
              const targetFrameId = getBlankFrameAtViewportPoint(
                payload.position
              )
              setIsDragOver(false)
              setDropTargetFrameId(null)

              // Only process drops that land within the timeline area.
              if (!isOverTimeline) return

              if (isHandlingDrop.current) return
              isHandlingDrop.current = true
              try {
                const replaced = targetFrameId
                  ? await replaceBlankFrameFromPaths(
                      targetFrameId,
                      payload.paths ?? []
                    )
                  : false

                if (!replaced) {
                  await processImagePaths(
                    payload.paths ?? [],
                    framesCountRef.current,
                    addFrameWithImage
                  )
                }
              } finally {
                isHandlingDrop.current = false
              }
            }
          }
        )
      } catch (err) {
        console.error("[AnimationTimeline] Tauri drag-drop setup failed:", err)
      }
    })()

    return () => {
      canceled = true
      unlistenFn?.()
    }
  }, [
    addFrameWithImage,
    getBlankFrameAtViewportPoint,
    replaceBlankFrameFromPaths,
  ])

  const contextMenu = menuState
    ? createPortal(
        <TimelineContextMenu
          ref={menuRef}
          left={menuPosition?.left ?? menuState.x}
          top={menuPosition?.top ?? menuState.y}
          title={menuState.frameId ? "Frame Actions" : "Timeline Actions"}
          onClose={closeContextMenu}
        >
          {menuState.frameId ? (
            <>
              <TimelineContextMenuItem
                label="Add frames..."
                description="Pick one or more images to append as timeline frames"
                disabled={!canCreateFrame}
                icon={<AddFramesIcon />}
                onClick={() =>
                  runMenuAction(() => framesInputRef.current?.click())
                }
              />
              <TimelineContextMenuDivider />
              <TimelineContextMenuItem
                label="Add blank frame before"
                description="Insert a transparent placeholder ahead of this one"
                disabled={!canCreateFrame}
                icon={<PlusSmIcon className="size-3.5" />}
                onClick={() =>
                  runMenuAction(() => insertFrame(menuState.frameId, "before"))
                }
              />
              <TimelineContextMenuItem
                label="Add blank frame after"
                description="Insert a transparent placeholder right after this one"
                disabled={!canCreateFrame}
                icon={<PlusSmIcon className="size-3.5" />}
                onClick={() =>
                  runMenuAction(() => insertFrame(menuState.frameId, "after"))
                }
              />
              <TimelineContextMenuDivider />
              <TimelineContextMenuItem
                label="Duplicate frame"
                description="Clone this frame and place the copy after it"
                disabled={!canCreateFrame}
                icon={<DuplicateIcon className="text-primary" />}
                onClick={() =>
                  runMenuAction(() => duplicateFrame(menuState.frameId!))
                }
              />
              <TimelineContextMenuItem
                label="Copy frame"
                description="Store this frame in the timeline clipboard"
                icon={<CopyFrameIcon />}
                onClick={() =>
                  runMenuAction(() => copyFrame(menuState.frameId!))
                }
              />
              <TimelineContextMenuItem
                label="Cut frame"
                description="Move this frame into the timeline clipboard"
                icon={<CutFrameIcon />}
                onClick={() =>
                  runMenuAction(() => cutFrame(menuState.frameId!))
                }
              />
              <TimelineContextMenuItem
                label="Paste before"
                description={`${clipboardPasteLabel} before this frame`}
                disabled={!canCreateFrame || !hasFrameClipboard}
                icon={<PasteFrameIcon />}
                onClick={() =>
                  runMenuAction(() => pasteFrame(menuState.frameId, "before"))
                }
              />
              <TimelineContextMenuItem
                label="Paste after"
                description={`${clipboardPasteLabel} after this frame`}
                disabled={!canCreateFrame || !hasFrameClipboard}
                icon={<PasteFrameIcon />}
                onClick={() =>
                  runMenuAction(() => pasteFrame(menuState.frameId, "after"))
                }
              />
              <TimelineContextMenuDivider />
              <TimelineContextMenuItem
                label="Delete frame"
                description="Remove this frame from the timeline"
                tone="danger"
                icon={<TrashFrameIcon />}
                onClick={() =>
                  runMenuAction(() => removeFrame(menuState.frameId!))
                }
              />
            </>
          ) : (
            <>
              <TimelineContextMenuItem
                label="Add frames..."
                description="Pick one or more images to append as timeline frames"
                disabled={!canCreateFrame}
                icon={<AddFramesIcon />}
                onClick={() =>
                  runMenuAction(() => framesInputRef.current?.click())
                }
              />
              <TimelineContextMenuItem
                label="Add blank frame"
                description="Append a transparent placeholder to the end of the timeline"
                disabled={!canCreateFrame}
                icon={<PlusSmIcon className="size-3.5" />}
                onClick={() => runMenuAction(() => insertFrame(null, "after"))}
              />
              <TimelineContextMenuItem
                label={clipboardPasteLabel}
                description="Append the stored frame to the end of the timeline"
                disabled={!canCreateFrame || !hasFrameClipboard}
                icon={<PasteFrameIcon />}
                onClick={() => runMenuAction(() => pasteFrame(null, "after"))}
              />
            </>
          )}
        </TimelineContextMenu>,
        document.body
      )
    : null

  // ── Empty state ────────────────────────────────────────────────────────────
  if (frames.length === 0) {
    return (
      <>
        <input
          ref={framesInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFramesImportChange}
        />
        <div
          ref={timelineContainerRef}
          onDragOver={handleExternalDragOver}
          onDragLeave={handleExternalDragLeave}
          onDrop={handleExternalDrop}
          onContextMenu={handleTimelineContextMenu}
          className={cn(
            "relative flex h-full items-center justify-center rounded-lg border border-dashed text-sm transition-all duration-200",
            isDragOver
              ? "scale-[0.99] border-primary bg-primary/5 text-primary"
              : "border-border/40 bg-muted/10 text-muted-foreground"
          )}
        >
          <div className="flex flex-col items-center gap-2 py-2">
            <FilmStripIcon
              className={cn(
                "opacity-30",
                isDragOver && "text-primary opacity-60"
              )}
            />
            <span className="text-[11px]">
              {isDragOver
                ? "Drop images to add frames"
                : "No frames yet — right-click to add frames or drop images here"}
            </span>
          </div>
        </div>
        {frameActionNoticeBanner}
        {contextMenu}
      </>
    )
  }

  // ── Populated timeline ─────────────────────────────────────────────────────
  return (
    <div
      ref={timelineContainerRef}
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
      onContextMenu={handleTimelineContextMenu}
      className={cn(
        "relative h-full overflow-hidden rounded-lg transition-all duration-200",
        isDragOver &&
          !dropTargetFrameId &&
          "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <input
        ref={framesInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFramesImportChange}
      />

      {/* External drop overlay */}
      {isDragOver && !dropTargetFrameId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-primary/8 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-primary/40 bg-card/80 px-5 py-3 text-primary shadow-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs font-medium">Drop to add frames</span>
          </div>
        </div>
      )}

      {/* ── Vertical scrolling grid strip ───────────────────────────── */}
      <div className="h-full overflow-x-hidden overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={frameIds} strategy={rectSortingStrategy}>
            {/* Wrapped/grid-like track for vertical scrolling */}
            <div className="flex flex-wrap items-start gap-1.5 px-2 py-1.5">
              {frames.map((frame, idx) => (
                <SortableFrame
                  key={frame.id}
                  frame={frame}
                  index={idx}
                  isSelected={frame.id === selectedFrameId}
                  isPlaying={isPlaying && frame.id === currentPlayableId}
                  staleLabel={staleBadgeLabel}
                  isDropTarget={frame.id === dropTargetFrameId}
                  onSelect={selectFrame}
                  onDelete={removeFrame}
                  onOpenContextMenu={handleFrameContextMenu}
                  onFrameImageDragOver={handleFrameImageDragOver}
                  onFrameImageDragLeave={handleFrameImageDragLeave}
                  onFrameImageDrop={handleFrameImageDrop}
                />
              ))}

              {/* ── End-of-track add button ─────────────────────────── */}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Frame count badge ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute top-1.5 right-2 flex items-center gap-1 rounded-md bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
        {staleFrameCount > 0 && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
            {staleSummaryLabel}
          </span>
        )}
        <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
          {frames.length} / {MAX_FRAMES}
        </span>
      </div>
      {frameActionNoticeBanner}
      {contextMenu}
    </div>
  )
}
