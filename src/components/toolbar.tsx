import { useRef } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useUndoStore } from "@/store/undo-store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { MAX_FRAMES } from "@/lib/constants";
import { processImageFiles } from "@/lib/import-utils";
import { cn } from "@/lib/utils";

export function Toolbar() {
  const frames = useAnimationStore((s) => {
    const anim = s.project.animations.find((a) => a.id === s.project.selectedAnimationId);
    return anim?.frames ?? [];
  });
  const selectedAnimName = useAnimationStore((s) => {
    const anim = s.project.animations.find((a) => a.id === s.project.selectedAnimationId);
    return anim?.name ?? "";
  });
  const addFrame = useAnimationStore((s) => s.addFrame);
  const addFrameWithImage = useAnimationStore((s) => s.addFrameWithImage);
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);
  const canUndo = useUndoStore((s) => s.pastStates.length > 0);
  const canRedo = useUndoStore((s) => s.futureStates.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = frames.length;
  const atMax = totalCount >= MAX_FRAMES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    await processImageFiles(Array.from(fileList), frames.length, addFrameWithImage);
    e.target.value = "";
  };

  return (
    <div className="flex h-7 shrink-0 items-center gap-0 border-b border-border/30 bg-card/60 px-2">

      {/* ── Left: Animation label ──────────────────────────────────────── */}
      <span className="mr-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
          <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
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
          <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
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
            "tabular-nums text-[10px] font-medium",
            atMax ? "text-destructive" : "text-muted-foreground/70",
          )}
        >
          {totalCount}
        </span>
        <span className="text-[10px] text-muted-foreground/40">/</span>
        <span className="text-[10px] text-muted-foreground/40">{MAX_FRAMES}</span>
      </div>
    </div>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────────

function PlusFrameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M3 13c0-4.97 4.03-9 9-9a9 9 0 0 1 6.36 2.64L21 9" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M21 13c0-4.97-4.03-9-9-9a9 9 0 0 0-6.36 2.64L3 9" />
    </svg>
  );
}
