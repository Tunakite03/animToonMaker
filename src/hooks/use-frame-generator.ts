"use client";

import { useCallback, useRef, useState } from "react";
import { useAnimationStore } from "@/store/animation-store";

export function useFrameGenerator() {
  const updateFrame = useAnimationStore((s) => s.updateFrame);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<Map<string, AbortController>>(new Map());

  const generateFrame = useCallback(
    async (frameId: string, prompt: string) => {
      const controller = new AbortController();
      abortControllerRef.current.set(frameId, controller);

      setGeneratingIds((prev) => new Set(prev).add(frameId));
      updateFrame(frameId, { status: "generating", errorMessage: undefined });

      try {
        const res = await fetch("/api/generate-frame", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Generation failed (${res.status})`);
        }

        const data = await res.json();
        updateFrame(frameId, {
          imageUrl: data.imageUrl,
          status: "done",
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown error";
        updateFrame(frameId, { status: "error", errorMessage: message });
      } finally {
        abortControllerRef.current.delete(frameId);
        setGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(frameId);
          return next;
        });
      }
    },
    [updateFrame],
  );

  const generateBatch = useCallback(
    async (frames: { id: string; prompt: string }[]) => {
      // Sequential generation to avoid rate limits
      for (const frame of frames) {
        if (!frame.prompt.trim()) continue;
        await generateFrame(frame.id, frame.prompt);
      }
    },
    [generateFrame],
  );

  const cancelGeneration = useCallback(
    (frameId: string) => {
      const controller = abortControllerRef.current.get(frameId);
      if (controller) {
        controller.abort();
        abortControllerRef.current.delete(frameId);
      }
      updateFrame(frameId, { status: "idle" });
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(frameId);
        return next;
      });
    },
    [updateFrame],
  );

  return {
    generateFrame,
    generateBatch,
    cancelGeneration,
    generatingIds,
    isGenerating: generatingIds.size > 0,
  };
}
