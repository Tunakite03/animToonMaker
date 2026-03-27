"use client";

import { useCallback, useState } from "react";
import GIF from "gif.js";
import { useAnimationStore } from "@/store/animation-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function ExportPanel() {
  const frames = useAnimationStore((s) => s.project.frames);
  const fps = useAnimationStore((s) => s.project.fps);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  const playableFrames = frames.filter((f) => f.imageUrl);

  const exportGif = useCallback(async () => {
    if (playableFrames.length === 0) return;
    setExporting(true);
    setProgress(0);

    try {
      // Preload all images
      const images = await Promise.all(
        playableFrames.map(
          (f) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = f.imageUrl!;
            }),
        ),
      );

      const width = 512;
      const height = 512;

      const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        workerScript: "/gif.worker.js",
      });

      // Create offscreen canvas for rendering
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext("2d")!;

      for (let i = 0; i < images.length; i++) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(images[i], 0, 0, width, height);
        gif.addFrame(ctx, {
          delay: playableFrames[i].duration,
          copy: true,
        });
        setProgress(Math.round(((i + 1) / images.length) * 50));
      }

      gif.on("progress", (p: number) => {
        setProgress(50 + Math.round(p * 50));
      });

      gif.on("finished", (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `animation-${Date.now()}.gif`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        setProgress(100);
      });

      gif.render();
    } catch (err) {
      console.error("Export failed:", err);
      setExporting(false);
    }
  }, [playableFrames]);

  const exportFrames = useCallback(() => {
    // Export all frame images as individual downloads
    playableFrames.forEach((frame, idx) => {
      if (!frame.imageUrl) return;
      const a = document.createElement("a");
      a.href = frame.imageUrl;
      a.download = `frame-${String(idx + 1).padStart(3, "0")}.png`;
      a.click();
    });
  }, [playableFrames]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={playableFrames.length < 2}>
          ⬇ Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Animation</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            {playableFrames.length} frames at {fps} FPS
          </div>

          {/* GIF export */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Animated GIF</Label>
            <Button onClick={exportGif} disabled={exporting}>
              {exporting ? "Encoding..." : "Download GIF"}
            </Button>
          </div>

          {/* Individual frames */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Individual Frames</Label>
            <Button variant="outline" onClick={exportFrames}>
              Download All Frames
            </Button>
          </div>

          {/* Progress */}
          {exporting && (
            <div className="flex flex-col gap-1">
              <Progress value={progress} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {progress}% complete
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
