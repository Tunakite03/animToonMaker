import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
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
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useAnimationStore } from "@/store/animation-store"
import type { Frame } from "@/types/animation"
import { cn } from "@/lib/utils"
import { MAX_FRAMES } from "@/lib/constants"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  processImageFiles,
  processImagePaths,
  readImageFile,
  readImagePath,
} from "@/lib/import-utils"
import {
  AddFramesIcon,
  CloseMenuIcon,
  CopyFrameIcon,
  CutFrameIcon,
  DuplicateIcon,
  EmptyFrameIcon,
  ErrorCircleIcon as ErrorIcon,
  FilmStripIcon,
  PasteFrameIcon,
  PlusSmIcon,
  TrashFrameIcon,
} from "@/components/icons"

// ── Frame thumbnail size ──────────────────────────────────────────────────────
const FRAME_W = 80 // px — matches 512×512 square canvas aspect

type TimelineMenuState = {
  frameId: string | null
  x: number
  y: number
}

function SortableFrame({
  frame,
  index,
  isSelected,
  isPlaying,
  onSelect,
  onDelete,
  onOpenContextMenu,
  isDropTarget,
  onFrameImageDragOver,
  onFrameImageDragLeave,
  onFrameImageDrop,
}: {
  frame: Frame
  index: number
  isSelected: boolean
  isPlaying: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onOpenContextMenu: (event: React.MouseEvent, frameId: string) => void
  isDropTarget: boolean
  onFrameImageDragOver: (event: React.DragEvent, frameId: string) => void
  onFrameImageDragLeave: (event: React.DragEvent, frameId: string) => void
  onFrameImageDrop: (event: React.DragEvent, frameId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 180ms ease",
    zIndex: isDragging ? 50 : undefined,
    width: FRAME_W,
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(frame.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-frame-id={frame.id}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(frame.id)}
      onContextMenu={(event) => onOpenContextMenu(event, frame.id)}
      onDragOver={(event) => onFrameImageDragOver(event, frame.id)}
      onDragLeave={(event) => onFrameImageDragLeave(event, frame.id)}
      onDrop={(event) => onFrameImageDrop(event, frame.id)}
      className={cn(
        "group/frame relative shrink-0 cursor-pointer overflow-hidden rounded-md border transition-all duration-150 select-none",
        // height fills the track
        "h-full",
        isSelected
          ? "border-primary shadow-[0_0_0_2px] shadow-primary/30"
          : "border-border/50 hover:border-primary/40 hover:shadow-sm",
        isPlaying &&
          isSelected &&
          "border-amber-400/80 shadow-[0_0_0_2px] shadow-amber-400/25",
        isDragging && "scale-95 opacity-50 shadow-xl",
        isDropTarget && "border-primary shadow-[0_0_0_2px] shadow-primary/25"
      )}
    >
      {/* ── Thumbnail ──────────────────────────────────────────────── */}
      {frame.isBlank ? (
        <div
          className={cn(
            "bg-checker flex h-full w-full flex-col items-center justify-center gap-1 px-1.5 text-center",
            "ring-1 ring-border/30 ring-inset",
            isDropTarget && "bg-primary/10 ring-primary/40"
          )}
        >
          {frame.status === "generating" ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-[9px] text-muted-foreground">Gen…</span>
            </>
          ) : frame.status === "error" ? (
            <>
              <ErrorIcon />
              <span className="text-[9px] text-destructive">Error</span>
            </>
          ) : (
            <>
              <EmptyFrameIcon />
              <span className="text-[8px] font-semibold tracking-[0.14em] text-muted-foreground/75 uppercase">
                Blank
              </span>
              <span
                className={cn(
                  "text-[8px] leading-tight text-muted-foreground/70",
                  isDropTarget && "text-primary"
                )}
              >
                {isDropTarget ? "Drop to replace" : "Transparent frame"}
              </span>
            </>
          )}
        </div>
      ) : frame.imageUrl ? (
        <img
          src={frame.imageUrl}
          alt={`Frame ${index + 1}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 px-1.5 text-center",
            isDropTarget && "bg-primary/10"
          )}
        >
          {frame.status === "generating" ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-[9px] text-muted-foreground">Gen…</span>
            </>
          ) : frame.status === "error" ? (
            <>
              <ErrorIcon />
              <span className="text-[9px] text-destructive">Error</span>
            </>
          ) : (
            <>
              <EmptyFrameIcon />
              <span className="text-[8px] font-semibold tracking-[0.14em] text-muted-foreground/75 uppercase">
                Blank
              </span>
              <span
                className={cn(
                  "text-[8px] leading-tight text-muted-foreground/70",
                  isDropTarget && "text-primary"
                )}
              >
                {isDropTarget ? "Drop to replace" : "Drop image or fill"}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Bottom strip: frame number ──────────────────────────────── */}
      <div
        className={cn(
          "absolute right-0 bottom-0 left-0 flex items-center justify-between px-1.5 py-0.5",
          "bg-linear-to-t from-black/70 via-black/30 to-transparent"
        )}
      >
        <span className="text-[9px] leading-none font-semibold text-white/90 tabular-nums">
          {index + 1}
        </span>
        {/* Status dot */}
        {frame.status === "done" && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60" />
        )}
        {frame.status === "generating" && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        )}
        {frame.status === "error" && (
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        )}
      </div>

      {/* ── Playing indicator bar ───────────────────────────────────── */}
      {isSelected && isPlaying && (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-amber-400" />
      )}

      {/* ── Selected indicator bar ──────────────────────────────────── */}
      {isSelected && !isPlaying && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      )}

      {/* ── Delete button (hover) ───────────────────────────────────── */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDelete}
            className={cn(
              "absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-sm",
              "bg-black/60 text-white/70 opacity-0 transition-all",
              "hover:bg-destructive hover:text-white",
              "group-hover/frame:opacity-100"
            )}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          Delete frame
        </TooltipContent>
      </Tooltip>

      {/* ── Drag handle overlay (invisible, just for cursor feel) ────── */}
      {!isDragging && (
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover/frame:opacity-100">
          <div className="absolute inset-x-0 bottom-6 flex items-center justify-center">
            <div className="flex gap-0.5 opacity-40">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-0.5 w-3 rounded-full bg-white" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main timeline component ───────────────────────────────────────────────────

export function AnimationTimeline() {
  const frames = useAnimationStore((s) => {
    const anim = s.project.animations.find(
      (a) => a.id === s.project.selectedAnimationId
    )
    return anim?.frames ?? []
  })
  const selectedFrameId = useAnimationStore((s) => s.project.selectedFrameId)
  const isPlaying = useAnimationStore((s) => s.playback.isPlaying)
  const currentFrameIndex = useAnimationStore(
    (s) => s.playback.currentFrameIndex
  )

  const selectFrame = useAnimationStore((s) => s.selectFrame)
  const reorderFrames = useAnimationStore((s) => s.reorderFrames)
  const removeFrame = useAnimationStore((s) => s.removeFrame)
  const updateFrame = useAnimationStore((s) => s.updateFrame)
  const addFrameWithImage = useAnimationStore((s) => s.addFrameWithImage)
  const insertFrame = useAnimationStore((s) => s.insertFrame)
  const duplicateFrame = useAnimationStore((s) => s.duplicateFrame)
  const copyFrame = useAnimationStore((s) => s.copyFrame)
  const cutFrame = useAnimationStore((s) => s.cutFrame)
  const pasteFrame = useAnimationStore((s) => s.pasteFrame)
  const frameClipboard = useAnimationStore((s) => s.frameClipboard)

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
  const currentPlayableId = playableFrames[currentFrameIndex]?.id
  const hasFrameClipboard = Boolean(frameClipboard)
  const canCreateFrame = frames.length < MAX_FRAMES
  const clipboardPasteLabel =
    frameClipboard?.mode === "cut" ? "Paste cut frame" : "Paste frame"

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
    (frameId: string, imageUrl: string, prompt: string) => {
      const targetFrame = frames.find((frame) => frame.id === frameId)
      if (!targetFrame || !targetFrame.isBlank) return false

      updateFrame(frameId, {
        imageUrl,
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
        imported.imageUrl,
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
        imported.imageUrl,
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
            "flex h-full items-center justify-center rounded-lg border border-dashed text-sm transition-all duration-200",
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
        <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
          {frames.length} / {MAX_FRAMES}
        </span>
      </div>
      {contextMenu}
    </div>
  )
}

// ── Add frame button at end of strip ─────────────────────────────────────────

const timelineContextMenuItemBase =
  "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"

type TimelineContextMenuProps = {
  children: ReactNode
  left: number
  top: number
  title: string
  onClose: () => void
}

const TimelineContextMenu = forwardRef<
  HTMLDivElement,
  TimelineContextMenuProps
>(({ children, left, top, title, onClose }, ref) => {
  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "fixed z-50 w-64 rounded-2xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        "ring-1 ring-black/5"
      )}
      style={{ left, top }}
    >
      <div className="flex items-center justify-between px-2.5 pt-1 pb-1">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close timeline menu"
        >
          <CloseMenuIcon />
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
})

TimelineContextMenu.displayName = "TimelineContextMenu"

function TimelineContextMenuItem({
  label,
  description,
  icon,
  disabled = false,
  onClick,
  tone = "default",
}: {
  label: string
  description: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        timelineContextMenuItemBase,
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10 disabled:text-destructive/50"
          : "text-foreground hover:bg-accent disabled:text-muted-foreground/45",
        "disabled:cursor-not-allowed disabled:hover:bg-transparent"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          tone === "danger"
            ? "border-destructive/15 bg-destructive/10"
            : "border-border/60 bg-background/80"
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] leading-none font-medium">{label}</span>
        <span
          className={cn(
            "text-[10px] leading-snug",
            tone === "danger" ? "text-destructive/75" : "text-muted-foreground"
          )}
        >
          {description}
        </span>
      </span>
    </button>
  )
}

function TimelineContextMenuDivider() {
  return <div className="my-1 h-px bg-border/70" />
}
