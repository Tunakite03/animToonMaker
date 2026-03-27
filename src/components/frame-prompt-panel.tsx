"use client";

import { useState } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useFrameGenerator } from "@/hooks/use-frame-generator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function FramePromptPanel() {
  const selectedFrame = useAnimationStore((s) => {
    const { frames, selectedFrameId } = s.project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  });
  const frames = useAnimationStore((s) => s.project.frames);
  const updateFrame = useAnimationStore((s) => s.updateFrame);
  const addFrame = useAnimationStore((s) => s.addFrame);
  const removeFrame = useAnimationStore((s) => s.removeFrame);
  const duplicateFrame = useAnimationStore((s) => s.duplicateFrame);

  const { generateFrame, generateBatch, cancelGeneration, isGenerating } =
    useFrameGenerator();

  const [batchPromptBase, setBatchPromptBase] = useState("");
  const [batchCount, setBatchCount] = useState(6);

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
    // Auto-generate all new frames
    generateBatch(ids);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Frame Editor</h3>
        {selectedFrame && (
          <Badge variant="outline" className="text-xs">
            {selectedFrame.status}
          </Badge>
        )}
      </div>

      {selectedFrame ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="frame-prompt" className="text-xs">
              Prompt
            </Label>
            <Textarea
              id="frame-prompt"
              value={selectedFrame.prompt}
              onChange={(e) =>
                updateFrame(selectedFrame.id, { prompt: e.target.value })
              }
              placeholder="Describe this frame..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          {selectedFrame.errorMessage && (
            <p className="text-xs text-destructive">
              {selectedFrame.errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={
                selectedFrame.status === "generating" ||
                !selectedFrame.prompt.trim()
              }
            >
              {selectedFrame.status === "generating"
                ? "Generating..."
                : "Generate"}
            </Button>
            {selectedFrame.status === "generating" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelGeneration(selectedFrame.id)}
              >
                Cancel
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => duplicateFrame(selectedFrame.id)}
            >
              Duplicate
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => removeFrame(selectedFrame.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Select a frame from the timeline, or add a new one.
        </p>
      )}

      <Separator />

      {/* Batch generation */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-semibold">Quick Animation</h4>
        <Textarea
          value={batchPromptBase}
          onChange={(e) => setBatchPromptBase(e.target.value)}
          placeholder="Base prompt for all frames (e.g. 'a cat walking')"
          className="min-h-[60px] resize-none text-sm"
        />
        <div className="flex items-center gap-2">
          <Label className="text-xs">Frames:</Label>
          <input
            type="number"
            min={2}
            max={24}
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="h-7 w-16 rounded-md border border-input bg-background px-2 text-center text-sm"
          />
          <Button
            size="sm"
            onClick={handleBatchAdd}
            disabled={isGenerating || !batchPromptBase.trim()}
          >
            {isGenerating ? "Generating..." : "Create & Generate"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Generate All button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerateAll}
        disabled={
          isGenerating ||
          frames.filter(
            (f) =>
              f.prompt.trim() && (f.status === "idle" || f.status === "error"),
          ).length === 0
        }
      >
        {isGenerating ? "Generating..." : "Generate All Pending"}
      </Button>
    </div>
  );
}
