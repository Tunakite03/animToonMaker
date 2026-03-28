import { useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { formatShortcutLabel } from "@/lib/shortcuts"
import {
  selectActiveAnimation,
  selectActiveFrames,
  useAnimationStore,
} from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import { useUndoStore } from "@/store/undo-store"
import {
  ImportIcon,
  PlusFrameIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { MAX_FRAMES } from "@/lib/constants"
import { processImageFiles } from "@/lib/import-utils"
import { cn } from "@/lib/utils"

export function Toolbar() {
  const frames = useAnimationStore(selectActiveFrames)
  const { selectedAnimName, addFrame, addFrameWithImage } = useAnimationStore(
    useShallow((s) => ({
      selectedAnimName: selectActiveAnimation(s)?.name ?? "",
      addFrame: s.addFrame,
      addFrameWithImage: s.addFrameWithImage,
    }))
  )
  const undo = useUndoStore((s) => s.undo)
  const redo = useUndoStore((s) => s.redo)
  const canUndo = useUndoStore((s) => s.pastStates.length > 0)
  const canRedo = useUndoStore((s) => s.futureStates.length > 0)
  const undoShortcut = useSettingsStore((s) => s.shortcutBindings.undo)
  const redoShortcut = useSettingsStore((s) => s.shortcutBindings.redo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalCount = frames.length
  const atMax = totalCount >= MAX_FRAMES

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    await processImageFiles(
      Array.from(fileList),
      frames.length,
      addFrameWithImage
    )
    e.target.value = ""
  }

  return (
    <div className="flex h-7 shrink-0 items-center gap-0 border-b border-border/30 bg-card/60 px-2">
      {/* ── Left: Animation label ──────────────────────────────────────── */}
      <span className="mr-2 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
        {selectedAnimName}
      </span>

      <Separator orientation="vertical" className="mx-1 h-3.5 opacity-40" />

      {/* ── Undo / Redo ───────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!canUndo}
              onClick={undo}
              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <UndoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Undo{undoShortcut ? ` (${formatShortcutLabel(undoShortcut)})` : ""}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={!canRedo}
              onClick={redo}
              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <RedoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Redo{redoShortcut ? ` (${formatShortcutLabel(redoShortcut)})` : ""}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="mx-1 h-3.5 opacity-40" />

      {/* ── Center: Frame actions ──────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        {/* Add blank frame */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={atMax}
              onClick={() => addFrame()}
              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <PlusFrameIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add blank frame</TooltipContent>
        </Tooltip>

        {/* Import images */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={atMax}
              onClick={() => fileInputRef.current?.click()}
              className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ImportIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Import image(s)</TooltipContent>
        </Tooltip>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* ── Right: Frame count ─────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">
        <span
          className={cn(
            "text-[10px] font-medium tabular-nums",
            atMax ? "text-destructive" : "text-muted-foreground/70"
          )}
        >
          {totalCount}
        </span>
        <span className="text-[10px] text-muted-foreground/40">/</span>
        <span className="text-[10px] text-muted-foreground/40">
          {MAX_FRAMES}
        </span>
      </div>
    </div>
  )
}
