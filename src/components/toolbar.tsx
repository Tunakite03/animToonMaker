import { useAnimationStore } from "@/store/animation-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div className="flex items-center gap-2 border-b border-border/40 bg-card/60 px-3 py-1.5">
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant={isPlaying ? "secondary" : "default"}
              onClick={handlePlay}
              disabled={playableCount < 2}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{isPlaying ? "Pause" : "Play"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleStop}
              disabled={!isPlaying}
            >
              <StopIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Stop</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Add frame */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="outline" onClick={() => addFrame()} className="gap-1.5 text-xs">
            <PlusIcon />
            Frame
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Add new frame</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-5" />

      {/* FPS control */}
      <div className="flex items-center gap-2">
        <Label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
          FPS: <span className="text-foreground">{fps}</span>
        </Label>
        <Slider
          value={[fps]}
          onValueChange={([v]) => setFps(v)}
          min={MIN_FPS}
          max={MAX_FPS}
          step={1}
          className="w-24"
        />
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Loop toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant={loop ? "default" : "outline"}
            onClick={() => setLoop(!loop)}
            className="gap-1.5 text-xs"
          >
            <RepeatIcon />
            {loop ? "Loop" : "Once"}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{loop ? "Loop enabled" : "Play once"}</TooltipContent>
      </Tooltip>

      {/* Frame count */}
      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>{frames.length} frames</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{playableCount} ready</span>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
