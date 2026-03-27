import { useState } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useFrameGenerator } from "@/hooks/use-frame-generator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export function FramePromptPanel() {
  const selectedFrame = useAnimationStore((s) => {
    const { frames, selectedFrameId } = s.project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  });
  const frames = useAnimationStore((s) => s.project.frames);
  const selectedFrameId = useAnimationStore((s) => s.project.selectedFrameId);
  const updateFrame = useAnimationStore((s) => s.updateFrame);
  const addFrame = useAnimationStore((s) => s.addFrame);
  const removeFrame = useAnimationStore((s) => s.removeFrame);
  const duplicateFrame = useAnimationStore((s) => s.duplicateFrame);

  const { generateFrame, generateBatch, cancelGeneration, isGenerating } =
    useFrameGenerator();

  const [batchPromptBase, setBatchPromptBase] = useState("");
  const [batchCount, setBatchCount] = useState(6);

  const selectedIndex = selectedFrame
    ? frames.findIndex((f) => f.id === selectedFrameId) + 1
    : 0;

  const handleGenerate = () => {
    if (!selectedFrame || !selectedFrame.prompt.trim()) return;
    generateFrame(selectedFrame.id, selectedFrame.prompt);
  };

  const handleGenerateAll = () => {
    const pending = frames.filter(
      (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error"),
    );
    generateBatch(pending);
  };

  const handleBatchAdd = () => {
    if (!batchPromptBase.trim()) return;
    const ids: { id: string; prompt: string }[] = [];
    for (let i = 0; i < batchCount; i++) {
      const prompt = `${batchPromptBase.trim()}, frame ${i + 1} of ${batchCount}`;
      const id = addFrame(prompt);
      ids.push({ id, prompt });
    }
    generateBatch(ids);
  };

  const handleDeleteFrame = () => {
    if (!selectedFrame) return;
    removeFrame(selectedFrame.id);
  };

  const pendingCount = frames.filter(
    (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error"),
  ).length;

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Frame Editor
          </h3>
          {selectedFrame && (
            <span className="text-xs text-muted-foreground/60">
              #{selectedIndex}
            </span>
          )}
        </div>
        {selectedFrame && (
          <StatusBadge status={selectedFrame.status} />
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {selectedFrame ? (
            <>
              {/* Prompt section */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="frame-prompt" className="text-xs font-medium text-muted-foreground">
                  Prompt
                </Label>
                <Textarea
                  id="frame-prompt"
                  value={selectedFrame.prompt}
                  onChange={(e) =>
                    updateFrame(selectedFrame.id, { prompt: e.target.value })
                  }
                  placeholder="Describe this frame..."
                  className="min-h-[80px] resize-none border-border/50 bg-background text-sm focus-visible:ring-primary/30"
                />
              </div>

              {selectedFrame.errorMessage && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  <p className="text-xs text-destructive">
                    {selectedFrame.errorMessage}
                  </p>
                </div>
              )}

              {/* Generation actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={
                    selectedFrame.status === "generating" ||
                    !selectedFrame.prompt.trim()
                  }
                  className="flex-1 gap-1.5"
                >
                  {selectedFrame.status === "generating" ? (
                    <>
                      <SpinnerIcon />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon />
                      Generate
                    </>
                  )}
                </Button>
                {selectedFrame.status === "generating" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelGeneration(selectedFrame.id)}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>

              <Separator className="opacity-50" />

              {/* Frame actions */}
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateFrame(selectedFrame.id)}
                      className="flex-1 gap-1.5"
                    >
                      <CopyIcon />
                      Duplicate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Duplicate this frame</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteFrame}
                      className="gap-1.5"
                    >
                      <TrashIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete frame</TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FrameIcon />
              </div>
              <p className="text-xs text-muted-foreground">
                Select a frame from the timeline
              </p>
            </div>
          )}

          <Separator className="opacity-50" />

          {/* Quick Animation section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Animation
            </h4>
            <Textarea
              value={batchPromptBase}
              onChange={(e) => setBatchPromptBase(e.target.value)}
              placeholder="Base prompt for all frames (e.g. 'a cat walking')"
              className="min-h-[56px] resize-none border-border/50 bg-background text-sm"
            />
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Frames</Label>
              <input
                type="number"
                min={2}
                max={24}
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="h-7 w-14 rounded-md border border-border/50 bg-background px-2 text-center text-sm"
              />
              <Button
                size="sm"
                onClick={handleBatchAdd}
                disabled={isGenerating || !batchPromptBase.trim()}
                className="ml-auto gap-1.5"
              >
                <SparklesIcon />
                Create
              </Button>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Generate All button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAll}
            disabled={isGenerating || pendingCount === 0}
            className="w-full gap-1.5"
          >
            {isGenerating ? (
              <>
                <SpinnerIcon />
                Generating...
              </>
            ) : (
              <>
                <PlayAllIcon />
                Generate All Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 min-w-4 justify-center px-1 text-[9px]">
                    {pendingCount}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    done: { color: "bg-emerald-500", label: "Done" },
    generating: { color: "bg-amber-400 animate-pulse", label: "Generating" },
    error: { color: "bg-red-400", label: "Error" },
    idle: { color: "bg-muted-foreground/40", label: "Idle" },
  }[status] ?? { color: "bg-muted-foreground/40", label: status };

  return (
    <Badge variant="outline" className="gap-1.5 border-border/50 text-[10px] font-normal">
      <div className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
      {config.label}
    </Badge>
  );
}

function SparklesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function FrameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function PlayAllIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
