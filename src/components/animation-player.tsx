import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useSettingsStore } from "@/store/settings-store";
import { useImagePreloader, usePlaybackLoop } from "@/hooks/use-playback";
import { CANVAS_BG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GRID_BACKGROUND = {
  backgroundImage: `
    linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
  `,
  backgroundSize: "32px 32px",
};

type AnimationPlayerProps = {
  children?: React.ReactNode;
  zoom?: number;
};

export function AnimationPlayer({ children, zoom = 1 }: AnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frames = useAnimationStore((state) => {
    const anim = state.project.animations.find((a) => a.id === state.project.selectedAnimationId);
    return anim?.frames ?? [];
  });
  const loop = useAnimationStore((state) => {
    const anim = state.project.animations.find((a) => a.id === state.project.selectedAnimationId);
    return anim?.loop ?? false;
  });
  const isPlaying = useAnimationStore((state) => state.playback.isPlaying);
  const setCurrentFrameIndex = useAnimationStore(
    (state) => state.setCurrentFrameIndex,
  );
  const setPlaying = useAnimationStore((state) => state.setPlaying);
  const currentFrameIndex = useAnimationStore(
    (state) => state.playback.currentFrameIndex,
  );
  const selectedFrameId = useAnimationStore(
    (state) => state.project.selectedFrameId,
  );
  const selectFrame = useAnimationStore((state) => state.selectFrame);

  const canvasWidth = useSettingsStore((state) => state.canvasWidth);
  const canvasHeight = useSettingsStore((state) => state.canvasHeight);
  const canvasQuality = useSettingsStore((state) => state.canvasQuality);
  const showGrid = useSettingsStore((state) => state.showGrid);

  const { preload, getImage } = useImagePreloader();

  const playableFrames = useMemo(
    () => frames.filter((frame) => frame.imageUrl),
    [frames],
  );
  const selectedFrame = useMemo(
    () => frames.find((frame) => frame.id === selectedFrameId) ?? null,
    [frames, selectedFrameId],
  );

  useEffect(() => {
    const urls = playableFrames
      .map((frame) => frame.imageUrl)
      .filter((url): url is string => Boolean(url));

    if (urls.length > 0) {
      void preload(urls);
    }
  }, [playableFrames, preload]);

  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = canvasQuality !== "low";
      ctx.imageSmoothingQuality =
        canvasQuality === "high"
          ? "high"
          : canvasQuality === "medium"
            ? "medium"
            : "low";

      const frame = playableFrames[index];
      if (!frame?.imageUrl) {
        ctx.fillStyle = CANVAS_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const drawImage = (image: CanvasImageSource) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      };

      const cachedImage = getImage(frame.imageUrl);
      if (cachedImage) {
        drawImage(cachedImage);
        return;
      }

      const tempImage = new Image();
      tempImage.onload = () => drawImage(tempImage);
      tempImage.src = frame.imageUrl;
    },
    [canvasQuality, getImage, playableFrames],
  );

  const playbackStartIndex = useMemo(() => {
    if (playableFrames.length === 0) return 0;

    if (selectedFrameId) {
      const selectedIdx = playableFrames.findIndex(
        (frame) => frame.id === selectedFrameId,
      );
      if (selectedIdx >= 0) return selectedIdx;
    }

    if (currentFrameIndex >= 0 && currentFrameIndex < playableFrames.length) {
      return currentFrameIndex;
    }

    return 0;
  }, [currentFrameIndex, playableFrames, selectedFrameId]);

  const onTick = useCallback(
    (frameIndex: number) => {
      setCurrentFrameIndex(frameIndex);

      const currentFrame = playableFrames[frameIndex];
      if (currentFrame) {
        selectFrame(currentFrame.id);
      }

      drawFrame(frameIndex);
    },
    [drawFrame, playableFrames, selectFrame, setCurrentFrameIndex],
  );

  usePlaybackLoop(onTick, {
    isPlaying,
    frames: playableFrames,
    loop,
    onStop: () => setPlaying(false),
    startIndex: playbackStartIndex,
  });

  useEffect(() => {
    if (isPlaying) return;

    if (selectedFrame && !selectedFrame.imageUrl) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (selectedFrameId) {
      const selectedIdx = playableFrames.findIndex(
        (frame) => frame.id === selectedFrameId,
      );
      if (selectedIdx >= 0) {
        drawFrame(selectedIdx);
        return;
      }
    }

    if (playableFrames.length > 0) {
      const index = Math.min(currentFrameIndex, playableFrames.length - 1);
      drawFrame(index);
    }
  }, [
    currentFrameIndex,
    drawFrame,
    isPlaying,
    playableFrames,
    selectedFrame,
    selectedFrameId,
  ]);

  useEffect(() => {
    if (playableFrames.length > 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [canvasHeight, canvasWidth, playableFrames.length]);

  const currentDisplay = Math.min(
    currentFrameIndex + 1,
    Math.max(1, playableFrames.length),
  );
  const displayWidth = Math.max(1, Math.round(canvasWidth * zoom));
  const displayHeight = Math.max(1, Math.round(canvasHeight * zoom));

  return (
    <div
      className={cn(
        "relative flex flex-1 items-center justify-center rounded-xl border border-border/40 p-3",
        "bg-checker shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]",
      )}
    >
      <div
        className="relative inline-flex"
        style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
      >
        {isPlaying ? (
          <div className="absolute -inset-px rounded-lg bg-primary/20 blur-sm" />
        ) : null}

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={cn(
            "relative block h-full w-full rounded-lg text-white",
            "shadow-[0_4px_24px_rgba(0,0,0,0.28),0_1px_4px_rgba(0,0,0,0.18)] ring-1",
            isPlaying ? "ring-primary/40" : "ring-border/60",
          )}
        />

        {showGrid ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={GRID_BACKGROUND}
          />
        ) : null}

        {children}
      </div>

      {frames.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background/80 px-6 py-5 backdrop-blur-sm">
            <EmptyCanvasIcon />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No frames yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Add frames and write prompts to generate animation
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {playableFrames.length > 0 ? (
        <div
          className={cn(
            "absolute bottom-4 right-4 flex items-center gap-1.5 rounded-md border border-border/30",
            "bg-background/75 px-2 py-1 shadow-sm backdrop-blur-md",
            isPlaying && "border-primary/30",
          )}
        >
          {isPlaying ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          ) : null}
          <span className="tabular-nums text-[11px] font-semibold text-foreground/75">
            {currentDisplay}
          </span>
          <span className="text-[10px] text-muted-foreground/50">/</span>
          <span className="tabular-nums text-[11px] text-muted-foreground/75">
            {playableFrames.length}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function EmptyCanvasIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground/30"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
