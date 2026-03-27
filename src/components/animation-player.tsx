"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useImagePreloader, usePlaybackLoop } from "@/hooks/use-playback";
import { CANVAS_BG } from "@/lib/constants";

export function AnimationPlayer({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const frames = useAnimationStore((s) => s.project.frames);
  const loop = useAnimationStore((s) => s.project.loop);
  const isPlaying = useAnimationStore((s) => s.playback.isPlaying);
  const setCurrentFrameIndex = useAnimationStore((s) => s.setCurrentFrameIndex);
  const currentFrameIndex = useAnimationStore((s) => s.playback.currentFrameIndex);
  const selectedFrameId = useAnimationStore((s) => s.project.selectedFrameId);

  const { preload, getImage } = useImagePreloader();

  // Playable frames only (those with images)
  const playableFrames = useMemo(
    () => frames.filter((f) => f.imageUrl),
    [frames],
  );

  // Preload images whenever frames change
  useEffect(() => {
    const urls = playableFrames
      .map((f) => f.imageUrl)
      .filter((u): u is string => !!u);
    if (urls.length > 0) {
      preload(urls);
    }
  }, [playableFrames, preload]);

  // Draw a frame to the canvas
  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const frame = playableFrames[index];
      if (!frame?.imageUrl) {
        ctx.fillStyle = CANVAS_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const img = getImage(frame.imageUrl);
      if (img) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        // Image not cached yet, try drawing anyway
        const tempImg = new Image();
        tempImg.src = frame.imageUrl;
        tempImg.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
        };
      }
    },
    [playableFrames, getImage],
  );

  // Playback loop callback
  const onTick = useCallback(
    (frameIndex: number) => {
      setCurrentFrameIndex(frameIndex);
      drawFrame(frameIndex);
    },
    [setCurrentFrameIndex, drawFrame],
  );

  usePlaybackLoop(onTick, {
    isPlaying,
    frames: playableFrames,
    loop,
  });

  // Draw selected or current frame when not playing
  useEffect(() => {
    if (!isPlaying) {
      if (selectedFrameId) {
        const selectedIdx = playableFrames.findIndex(
          (f) => f.id === selectedFrameId,
        );
        if (selectedIdx >= 0) {
          drawFrame(selectedIdx);
          return;
        }
      }
      if (playableFrames.length > 0) {
        const idx = Math.min(currentFrameIndex, playableFrames.length - 1);
        drawFrame(idx);
      }
    }
  }, [isPlaying, selectedFrameId, currentFrameIndex, playableFrames, drawFrame]);

  // Draw empty state
  useEffect(() => {
    if (playableFrames.length === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add frames to start", canvas.width / 2, canvas.height / 2);
    }
  }, [playableFrames.length]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 items-center justify-center rounded-xl border border-border bg-gradient-to-b from-muted/40 to-muted/20 p-3"
    >
      <div className="relative inline-flex">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          className="block max-h-[480px] max-w-full rounded-lg shadow-sm ring-1 ring-border/50"
          style={{ imageRendering: "auto" }}
        />
        {children}
      </div>
      {/* Frame counter overlay */}
      {playableFrames.length > 0 && (
        <div className="absolute bottom-5 right-5 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          {Math.min(currentFrameIndex + 1, playableFrames.length)} / {playableFrames.length}
        </div>
      )}
    </div>
  );
}
