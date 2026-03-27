import { useState } from "react"
import { useAnimationStore } from "@/store/animation-store"
import { useFrameGenerator } from "@/hooks/use-frame-generator"
import {
  AlertIcon,
  CopyIcon,
  EmptyFrameIcon,
  ErrorCircleIcon,
  FrameSelectIcon,
  LayersIcon,
  PenLineIcon,
  PlayAllIcon,
  SparklesIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const PROMPT_MAX = 1000
const BATCH_MAX = 24
const BATCH_MIN = 2

export function FramePromptPanel() {
  const selectedFrame = useAnimationStore((s) => {
    const anim = s.project.animations.find(
      (a) => a.id === s.project.selectedAnimationId
    )
    const frames = anim?.frames ?? []
    return frames.find((f) => f.id === s.project.selectedFrameId) ?? null
  })
  const frames = useAnimationStore((s) => {
    const anim = s.project.animations.find(
      (a) => a.id === s.project.selectedAnimationId
    )
    return anim?.frames ?? []
  })
  const selectedFrameId = useAnimationStore((s) => s.project.selectedFrameId)
  const updateFrame = useAnimationStore((s) => s.updateFrame)
  const addFrame = useAnimationStore((s) => s.addFrame)
  const removeFrame = useAnimationStore((s) => s.removeFrame)
  const duplicateFrame = useAnimationStore((s) => s.duplicateFrame)

  const { generateFrame, generateBatch, cancelGeneration, isGenerating } =
    useFrameGenerator()

  const [batchPrompt, setBatchPrompt] = useState("")
  const [batchCount, setBatchCount] = useState(6)

  const selectedIndex = selectedFrame
    ? frames.findIndex((f) => f.id === selectedFrameId) + 1
    : 0

  const promptLength = selectedFrame?.prompt.length ?? 0
  const promptNearLimit = promptLength > PROMPT_MAX * 0.85
  const pendingCount = frames.filter(
    (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error")
  ).length

  const handleGenerate = () => {
    if (!selectedFrame || !selectedFrame.prompt.trim()) return
    generateFrame(selectedFrame.id, selectedFrame.prompt)
  }

  const handleGenerateAll = () => {
    const pending = frames.filter(
      (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error")
    )
    generateBatch(pending)
  }

  const handleBatchCreate = () => {
    if (!batchPrompt.trim()) return
    const ids: { id: string; prompt: string }[] = []
    for (let i = 0; i < batchCount; i++) {
      const prompt = `${batchPrompt.trim()}, frame ${i + 1} of ${batchCount}`
      const id = addFrame(prompt)
      ids.push({ id, prompt })
    }
    generateBatch(ids)
  }

  const handleDeleteFrame = () => {
    if (!selectedFrame) return
    removeFrame(selectedFrame.id)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
            <PenLineIcon />
          </div>
          <span className="text-xs font-semibold tracking-wide text-foreground/80">
            Frame Editor
          </span>
          {selectedFrame && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              #{selectedIndex}
            </span>
          )}
        </div>
        {selectedFrame && <StatusPill status={selectedFrame.status} />}
      </div>

      {/* ── Frame preview strip (when a frame is selected) ────────────── */}
      {selectedFrame && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
          {/* Thumbnail */}
          <div
            className={cn(
              "relative h-13 w-13 shrink-0 overflow-hidden rounded-lg border bg-muted/60",
              selectedFrame.status === "done" ||
                (selectedFrame.imageUrl && !selectedFrame.isBlank)
                ? "border-border/60"
                : "border-border/40"
            )}
          >
            {selectedFrame.status === "generating" ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : selectedFrame.status === "error" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <ErrorCircleIcon />
              </div>
            ) : selectedFrame.imageUrl && !selectedFrame.isBlank ? (
              <img
                src={selectedFrame.imageUrl}
                alt={`Frame ${selectedIndex}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="bg-checker flex h-full w-full items-center justify-center text-muted-foreground/25">
                <EmptyFrameIcon />
              </div>
            )}

            {/* Status badge on thumbnail */}
            {selectedFrame.status === "done" && (
              <div className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60" />
            )}
          </div>

          {/* Frame meta info */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm leading-none font-semibold text-foreground/90">
                Frame {selectedIndex}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                of {frames.length}
              </span>
            </div>

            {selectedFrame.prompt ? (
              <p className="truncate font-mono text-[10px] leading-none text-muted-foreground/60">
                {selectedFrame.prompt.slice(0, 48)}
                {selectedFrame.prompt.length > 48 ? "…" : ""}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                No prompt yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col divide-y divide-border/40">
          {/* ── Section: Prompt + Generate ────────────────────────── */}
          <div className="px-4 py-4">
            {selectedFrame ? (
              <div className="flex flex-col gap-3">
                {/* Prompt label row */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="frame-prompt"
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                  >
                    <SparklesIcon size={10} />
                    Prompt
                  </label>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums transition-colors",
                      promptNearLimit
                        ? promptLength >= PROMPT_MAX
                          ? "font-semibold text-destructive"
                          : "text-amber-500"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {promptLength}/{PROMPT_MAX}
                  </span>
                </div>

                {/* Textarea */}
                <Textarea
                  id="frame-prompt"
                  value={selectedFrame.prompt}
                  onChange={(e) => {
                    if (e.target.value.length <= PROMPT_MAX) {
                      updateFrame(selectedFrame.id, { prompt: e.target.value })
                    }
                  }}
                  placeholder="Describe this frame in detail…"
                  className="min-h-16 resize-none border-border/60 bg-background/60 text-sm leading-relaxed placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />

                {/* Error message */}
                {selectedFrame.errorMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/6 px-3 py-2">
                    <AlertIcon className="mt-0.5 shrink-0 text-destructive/70" />
                    <p className="text-[11px] leading-relaxed text-destructive/85">
                      {selectedFrame.errorMessage}
                    </p>
                  </div>
                )}

                {/* Generate button */}
                <div className="relative">
                  <Button
                    onClick={handleGenerate}
                    disabled={
                      selectedFrame.status === "generating" ||
                      !selectedFrame.prompt.trim()
                    }
                    className="relative h-9 w-full gap-2 font-medium"
                  >
                    {selectedFrame.status === "generating" ? (
                      <>
                        <SpinnerIcon />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon size={14} />
                        <span>
                          {selectedFrame.status === "done"
                            ? "Regenerate"
                            : "Generate Frame"}
                        </span>
                      </>
                    )}
                  </Button>

                  {/* Inline cancel — only during generation */}
                  {selectedFrame.status === "generating" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => cancelGeneration(selectedFrame.id)}
                          className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-white/20 text-white transition-colors hover:bg-white/35"
                        >
                          <XIcon size={9} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Cancel generation
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Secondary actions */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateFrame(selectedFrame.id)}
                        className="h-7 flex-1 gap-1.5 border-border/60 text-xs hover:border-primary/40 hover:bg-primary/5"
                      >
                        <CopyIcon />
                        Duplicate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Duplicate this frame
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteFrame}
                        className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <TrashIcon />
                        <span className="sr-only">Delete frame</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete frame</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/30">
                  <FrameSelectIcon />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">
                    No frame selected
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground/50">
                    Click a frame in the timeline
                    <br />
                    below to edit it
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Generate All Pending ─────────────────────── */}
          {pendingCount > 0 && (
            <div className="px-4 py-3">
              <Button
                variant="outline"
                onClick={handleGenerateAll}
                disabled={isGenerating || pendingCount === 0}
                className="h-8 w-full gap-2 border-border/60 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {isGenerating ? (
                  <>
                    <SpinnerIcon />
                    Generating batch…
                  </>
                ) : (
                  <>
                    <PlayAllIcon />
                    Generate All Pending
                    <Badge
                      variant="secondary"
                      className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[9px] font-bold"
                    >
                      {pendingCount}
                    </Badge>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Section: Quick Animation ───────────────────────────── */}
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-muted text-muted-foreground">
                <LayersIcon />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Quick Animation
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <Textarea
                value={batchPrompt}
                onChange={(e) => setBatchPrompt(e.target.value)}
                placeholder='Base prompt for all frames (e.g. "a cat walking")'
                className="min-h-14 resize-none border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />

              {/* Count controls + Create button */}
              <div className="flex items-center gap-2">
                {/* Frame count input */}
                <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">
                    Frames
                  </span>
                  <input
                    type="number"
                    min={BATCH_MIN}
                    max={BATCH_MAX}
                    value={batchCount}
                    onChange={(e) =>
                      setBatchCount(
                        Math.max(
                          BATCH_MIN,
                          Math.min(BATCH_MAX, Number(e.target.value))
                        )
                      )
                    }
                    className="w-8 bg-transparent text-center text-sm font-bold text-foreground outline-none"
                  />
                </div>

                {/* Quick presets */}
                <div className="flex gap-1">
                  {[4, 8, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBatchCount(n)}
                      className={cn(
                        "h-6 rounded px-1.5 text-[10px] font-semibold transition-colors",
                        batchCount === n
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleBatchCreate}
                  disabled={isGenerating || !batchPrompt.trim()}
                  className="ml-auto h-7 gap-1.5 text-xs"
                >
                  <SparklesIcon size={11} />
                  Create
                </Button>
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground/50">
                Creates {batchCount} frames with sequential prompts and starts
                generating.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const config = {
    done: {
      dot: "bg-emerald-400 shadow-[0_0_5px_1px] shadow-emerald-400/40",
      text: "text-emerald-500 dark:text-emerald-400",
      label: "Done",
    },
    generating: {
      dot: "bg-amber-400 animate-pulse shadow-[0_0_5px_1px] shadow-amber-400/40",
      text: "text-amber-500 dark:text-amber-400",
      label: "Generating",
    },
    error: {
      dot: "bg-red-400 shadow-[0_0_5px_1px] shadow-red-400/40",
      text: "text-red-500 dark:text-red-400",
      label: "Error",
    },
    idle: {
      dot: "bg-muted-foreground/30",
      text: "text-muted-foreground/50",
      label: "Idle",
    },
  }[status] ?? {
    dot: "bg-muted-foreground/30",
    text: "text-muted-foreground/50",
    label: status,
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      <span className={cn("text-[10px] font-semibold", config.text)}>
        {config.label}
      </span>
    </div>
  )
}
