"use client";

import { useAnimationStore } from "@/store/animation-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MIN_FPS, MAX_FPS } from "@/lib/constants";

export function Toolbar() {
  const fps = useAnimationStore((s) => s.project.fps);
  const loop = useAnimationStore((s) => s.project.loop);
  const frames = useAnimationStore((s) => s.project.frames);
  const isPlaying = useAnimationStore((s) => s.playback.isPlaying);

  const setFps = useAnimationStore((s) => s.setFps);
  const setLoop = useAnimationStore((s) => s.setLoop);
  const setPlaying = useAnimationStore((s) => s.setPlaying);
  const addFrame = useAnimationStore((s) => s.addFrame);
  const setCurrentFrameIndex = useAnimationStore((s) => s.setCurrentFrameIndex);

  const playableCount = frames.filter((f) => f.imageUrl).length;

  const handlePlay = () => {
    if (isPlaying) {
      setPlaying(false);
    } else {
      setCurrentFrameIndex(0);
      setPlaying(true);
    }
  };

  const handleStop = () => {
    setPlaying(false);
    setCurrentFrameIndex(0);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-2.5 backdrop-blur-sm">
      {/* Playback controls */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={isPlaying ? "secondary" : "default"}
          onClick={handlePlay}
          disabled={playableCount < 2}
          className="gap-1.5"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          disabled={!isPlaying}
        >
          ⏹
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Add frame */}
      <Button size="sm" variant="outline" onClick={() => addFrame()}>
        + Frame
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* FPS */}
      <div className="flex items-center gap-2">
        <Label className="text-xs whitespace-nowrap">FPS: {fps}</Label>
        <Slider
          value={[fps]}
          onValueChange={([v]) => setFps(v)}
          min={MIN_FPS}
          max={MAX_FPS}
          step={1}
          className="w-28"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Loop toggle */}
      <Button
        size="xs"
        variant={loop ? "default" : "outline"}
        onClick={() => setLoop(!loop)}
      >
        {loop ? "🔁 Loop ON" : "Loop OFF"}
      </Button>

      {/* Frame count info */}
      <span className="ml-auto text-xs text-muted-foreground">
        {frames.length} frames ({playableCount} ready)
      </span>
    </div>
  );
}
