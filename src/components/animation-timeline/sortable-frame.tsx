import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Frame } from "@/types/animation"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  EmptyFrameIcon,
  ErrorCircleIcon as ErrorIcon,
} from "@/components/icons"

const FRAME_W = 80 // px — matches 512×512 square canvas aspect

interface SortableFrameProps {
  frame: Frame
  index: number
  isSelected: boolean
  isPlaying: boolean
  staleLabel: string
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onOpenContextMenu: (event: React.MouseEvent, frameId: string) => void
  isDropTarget: boolean
  onFrameImageDragOver: (event: React.DragEvent, frameId: string) => void
  onFrameImageDragLeave: (event: React.DragEvent, frameId: string) => void
  onFrameImageDrop: (event: React.DragEvent, frameId: string) => void
}

export const SortableFrame = memo(
  function SortableFrame({
    frame,
    index,
    isSelected,
    isPlaying,
    staleLabel,
    onSelect,
    onDelete,
    onOpenContextMenu,
    isDropTarget,
    onFrameImageDragOver,
    onFrameImageDragLeave,
    onFrameImageDrop,
  }: SortableFrameProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: frame.id })
    const isStale = Boolean(frame.continuityStale)
    const hasReferenceLink =
      Boolean(frame.continuitySourceFrameId) && !isStale && !frame.isBlank

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
          "h-full",
          isSelected
            ? "border-primary shadow-[0_0_0_2px] shadow-primary/30"
            : isStale
              ? "border-amber-400/70 hover:border-amber-400/90 hover:shadow-sm"
              : "border-border/50 hover:border-primary/40 hover:shadow-sm",
          isPlaying &&
            isSelected &&
            "border-amber-400/80 shadow-[0_0_0_2px] shadow-amber-400/25",
          isDragging && "scale-95 opacity-50 shadow-xl",
          isDropTarget && "border-primary shadow-[0_0_0_2px] shadow-primary/25"
        )}
      >
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
        ) : frame.imageAssetId ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 px-1.5 text-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-[9px] text-muted-foreground">Loading…</span>
          </div>
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

        {isStale ? (
          <div className="absolute top-1 left-1 rounded-sm bg-amber-400/95 px-1 py-0.5 text-[8px] font-semibold text-amber-950 shadow-sm">
            {staleLabel}
          </div>
        ) : hasReferenceLink ? (
          <div className="absolute top-1 left-1 rounded-sm bg-sky-500/85 px-1 py-0.5 text-[8px] font-semibold text-white shadow-sm">
            Ref
          </div>
        ) : null}

        <div
          className={cn(
            "absolute right-0 bottom-0 left-0 flex items-center justify-between px-1.5 py-0.5",
            "bg-linear-to-t from-black/70 via-black/30 to-transparent"
          )}
        >
          <span className="text-[9px] leading-none font-semibold text-white/90 tabular-nums">
            {index + 1}
          </span>
          {isStale ? (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px] shadow-amber-400/60" />
          ) : frame.status === "done" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60" />
          ) : null}
          {frame.status === "generating" && !isStale && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          )}
          {frame.status === "error" && !isStale && (
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          )}
        </div>

        {isSelected && isPlaying && (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-amber-400" />
        )}
        {isSelected && !isPlaying && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
        )}

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
  },
  (previous, current) =>
    previous.frame === current.frame &&
    previous.index === current.index &&
    previous.isSelected === current.isSelected &&
    previous.isPlaying === current.isPlaying &&
    previous.isDropTarget === current.isDropTarget &&
    previous.onSelect === current.onSelect &&
    previous.onDelete === current.onDelete &&
    previous.onOpenContextMenu === current.onOpenContextMenu &&
    previous.onFrameImageDragOver === current.onFrameImageDragOver &&
    previous.onFrameImageDragLeave === current.onFrameImageDragLeave &&
    previous.onFrameImageDrop === current.onFrameImageDrop
)
