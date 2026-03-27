import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useSettingsStore } from "@/store/settings-store";
import { AnimationPlayer } from "@/components/animation-player";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  createSolidColorImage,
  flipImage,
  removeBackground,
  rotateImage,
} from "@/lib/image-utils";
import { readImageFile } from "@/lib/import-utils";
import { MIN_FPS, MAX_FPS } from "@/lib/constants";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1;
const BLANK_FRAME_QUICK_COLORS = [
  "#f8fafc",
  "#fed7aa",
  "#fca5a5",
  "#fde68a",
  "#86efac",
  "#7dd3fc",
  "#c4b5fd",
  "#f9a8d4",
];

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function CanvasEditor() {
  // ── Frame / playback state ──────────────────────────────────────────────────
  const selectedFrame = useAnimationStore((s) => {
    const { frames, selectedFrameId } = s.project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  });
  const isPlaying  = useAnimationStore((s) => s.playback.isPlaying);
  const fps        = useAnimationStore((s) => s.project.fps);
  const loop       = useAnimationStore((s) => s.project.loop);
  const frames     = useAnimationStore((s) => s.project.frames);
  const projectWidth = useAnimationStore((s) => s.project.width);
  const projectHeight = useAnimationStore((s) => s.project.height);
  const currentFrameIndex = useAnimationStore((s) => s.playback.currentFrameIndex);

  const updateFrame        = useAnimationStore((s) => s.updateFrame);
  const setFps             = useAnimationStore((s) => s.setFps);
  const setLoop            = useAnimationStore((s) => s.setLoop);
  const setPlaying         = useAnimationStore((s) => s.setPlaying);
  const setCurrentFrameIndex = useAnimationStore((s) => s.setCurrentFrameIndex);
  const showOnionSkin = useSettingsStore((s) => s.showOnionSkin);
  const onionSkinOpacity = useSettingsStore((s) => s.onionSkinOpacity);

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [blankFrameFillColor, setBlankFrameFillColor] = useState("#f8fafc");
  const [isCanvasImageDragOver, setIsCanvasImageDragOver] = useState(false);
  const canvasViewportRef = useRef<HTMLElement>(null);
  const blankFrameInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasImage      = !!selectedFrame?.imageUrl;
  const showFrameActions = !isPlaying && Boolean(selectedFrame);
  const showTools     = showFrameActions && hasImage && !selectedFrame?.isBlank;

  const playableFrames = frames.filter((f) => f.imageUrl);
  const playableCount  = playableFrames.length;
  const currentDisplay = Math.min(currentFrameIndex + 1, Math.max(1, playableCount));
  const onionSkinImageUrl = useMemo(() => {
    if (!showOnionSkin || isPlaying || playableFrames.length < 2) return null;

    if (selectedFrame) {
      const selectedIndex = frames.findIndex((frame) => frame.id === selectedFrame.id);
      for (let index = selectedIndex - 1; index >= 0; index -= 1) {
        if (frames[index]?.imageUrl) {
          return frames[index].imageUrl;
        }
      }
    }

    if (currentFrameIndex > 0) {
      return playableFrames[currentFrameIndex - 1]?.imageUrl ?? null;
    }

    return null;
  }, [
    currentFrameIndex,
    frames,
    isPlaying,
    playableFrames,
    selectedFrame,
    showOnionSkin,
  ]);
  const zoomPercent = Math.round(zoom * 100);

  // ── Playback handlers ───────────────────────────────────────────────────────
  const handlePlay = () => {
    if (isPlaying) {
      setPlaying(false);
      return;
    }

    // Start playback from the currently selected playable frame.
    // If selected frame has no image, fall back to first playable frame.
    const selectedPlayableIndex = selectedFrame
      ? playableFrames.findIndex((f) => f.id === selectedFrame.id)
      : -1;

    setCurrentFrameIndex(selectedPlayableIndex >= 0 ? selectedPlayableIndex : 0);
    setPlaying(true);
  };

  const handleStop = () => {
    setPlaying(false);
    setCurrentFrameIndex(0);
  };

  // ── Image transform handlers ────────────────────────────────────────────────
  const handleRotate = useCallback(
    async (degrees: 90 | -90) => {
      if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await rotateImage(selectedFrame.imageUrl, degrees);
        updateFrame(selectedFrame.id, { imageUrl: result, isBlank: false });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFrame, updateFrame, isProcessing],
  );

  const handleFlip = useCallback(
    async (horizontal: boolean) => {
      if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await flipImage(selectedFrame.imageUrl, horizontal);
        updateFrame(selectedFrame.id, { imageUrl: result, isBlank: false });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFrame, updateFrame, isProcessing],
  );

  const handleRemoveBg = useCallback(async () => {
    if (!selectedFrame?.imageUrl || selectedFrame.isBlank || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await removeBackground(selectedFrame.imageUrl);
      updateFrame(selectedFrame.id, { imageUrl: result, isBlank: false });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFrame, updateFrame, isProcessing]);

  // ── Keypoint handlers ───────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setZoom((current) => clampZoom(current + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((current) => clampZoom(current - ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const applyImportedImageToSelectedFrame = useCallback(
    async (files: File[]) => {
      if (!selectedFrame) return;

      const firstImageFile = files.find((file) => file.type.startsWith("image/"));
      if (!firstImageFile) return;

      const imported = await readImageFile(firstImageFile);
      if (!imported) return;

      updateFrame(selectedFrame.id, {
        imageUrl: imported.imageUrl,
        prompt: selectedFrame.prompt.trim() ? selectedFrame.prompt : imported.prompt,
        status: "done",
        errorMessage: undefined,
        isBlank: false,
      });
    },
    [selectedFrame, updateFrame],
  );

  const handleBlankFrameInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      await applyImportedImageToSelectedFrame(Array.from(fileList));
      event.target.value = "";
    },
    [applyImportedImageToSelectedFrame],
  );

  const handleBlankFrameFill = useCallback(() => {
    if (!selectedFrame) return;

    const imageUrl = createSolidColorImage(
      blankFrameFillColor,
      projectWidth,
      projectHeight,
    );

    updateFrame(selectedFrame.id, {
      imageUrl,
      status: "done",
      errorMessage: undefined,
      isBlank: false,
    });
  }, [
    blankFrameFillColor,
    projectHeight,
    projectWidth,
    selectedFrame,
    updateFrame,
  ]);

  const handleCanvasImageDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!showFrameActions || !event.dataTransfer.types.includes("Files")) return;

      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsCanvasImageDragOver(true);
    },
    [showFrameActions],
  );

  const handleCanvasImageDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setIsCanvasImageDragOver(false);
    },
    [],
  );

  const handleCanvasImageDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!showFrameActions) return;

      event.preventDefault();
      setIsCanvasImageDragOver(false);
      await applyImportedImageToSelectedFrame(Array.from(event.dataTransfer.files));
    },
    [applyImportedImageToSelectedFrame, showFrameActions],
  );

  useEffect(() => {
    if (!showFrameActions) {
      setIsCanvasImageDragOver(false);
    }
  }, [showFrameActions]);

  useEffect(() => {
    const element = canvasViewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      setZoom((current) =>
        clampZoom(current + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)),
      );
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Unified toolbar (always visible) ───────────────────────── */}
      <div className="flex h-10 shrink-0 items-center border-b border-border/50 bg-card/90 px-3 backdrop-blur-sm">

        {/* LEFT: Image edit tools — only when a frame with an image is selected */}
        {showFrameActions && (
          <div className="mr-1 flex items-center gap-1.5">


            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => blankFrameInputRef.current?.click()}
                  className={cn(
                    "h-7 gap-1.5 px-2.5 text-[11px] font-medium transition-colors",
                    isCanvasImageDragOver
                      ? "bg-primary/10 text-primary hover:bg-primary/14 hover:text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <BlankFrameUploadIcon className="h-3.5 w-3.5 text-current" />
                  {selectedFrame?.isBlank ? "Add Image" : "Replace Image"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {selectedFrame?.isBlank
                  ? "Click here or drag an image into the canvas to fill this frame"
                  : "Click here or drag an image into the canvas to replace this frame"}
              </TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-border/70 shadow-sm"
                        style={{ backgroundColor: blankFrameFillColor }}
                      />
                      Fill Color
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Replace the selected frame with a solid color
                </TooltipContent>
              </Tooltip>

              <PopoverContent
                align="start"
                side="bottom"
                className="w-80 rounded-2xl border border-border/70 bg-background/96 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
              >
                <PopoverHeader className="gap-1">
                  <PopoverTitle className="text-sm font-semibold text-foreground">
                    Frame fill
                  </PopoverTitle>
                  <PopoverDescription className="text-xs leading-relaxed">
                    Paint the selected frame with a solid color. This works for blank placeholders and existing frames.
                  </PopoverDescription>
                </PopoverHeader>

                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
                  <label
                    className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl border border-border/70 shadow-sm"
                    style={{ backgroundColor: blankFrameFillColor }}
                  >
                    <input
                      type="color"
                      value={blankFrameFillColor}
                      onChange={(event) =>
                        setBlankFrameFillColor(event.target.value)
                      }
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Choose a fill color for the selected frame"
                    />
                  </label>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Active Color
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {blankFrameFillColor.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {BLANK_FRAME_QUICK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBlankFrameFillColor(color)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                        blankFrameFillColor === color
                          ? "border-foreground shadow-sm"
                          : "border-white/80",
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Use ${color} as the frame fill color`}
                    />
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleBlankFrameFill}
                  className="mt-4 w-full gap-1.5"
                >
                  <SolidFillIcon />
                  Fill Frame
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {showTools && (
          <div className="flex items-center gap-1.5">

            {/* Mode toggle — pill */}
            {/* Transform buttons */}
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleRotate(-90)} disabled={isProcessing}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <RotateCCWIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rotate 90° left</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleRotate(90)} disabled={isProcessing}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <RotateCWIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rotate 90° right</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="mx-0.5 h-3.5 opacity-40" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleFlip(true)} disabled={isProcessing}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <FlipHIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Flip horizontal</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="ghost" onClick={() => handleFlip(false)} disabled={isProcessing}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <FlipVIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Flip vertical</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="mx-0.5 h-4 opacity-60" />

            {/* Remove BG */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={handleRemoveBg} disabled={isProcessing}
                  className="h-7 gap-1.5 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                  {isProcessing ? <SpinnerIcon /> : <EraserIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Remove background (flood fill from edges)</TooltipContent>
            </Tooltip>

          </div>
        )}

        {/* RIGHT: Playback controls + FPS — always visible, pushed to right */}
        <div className="ml-auto flex items-center gap-1">

          {/* Skip to start */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={handleStop}
                disabled={!isPlaying && currentFrameIndex === 0}
                className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <SkipBackIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Skip to start</TooltipContent>
          </Tooltip>

          {/* Play / Pause — prominent round button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handlePlay}
                disabled={playableCount < 2}
                className={cn(
                  "h-8 w-8 rounded-full shadow-md transition-all",
                  isPlaying
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 disabled:opacity-30",
                )}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPlaying ? "Pause" : playableCount < 2 ? "Need ≥2 frames with images" : "Play animation"}
            </TooltipContent>
          </Tooltip>

          {/* Loop toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setLoop(!loop)}
                className={cn(
                  "h-7 w-7 transition-colors",
                  loop ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <RepeatIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{loop ? "Loop on" : "Loop off"}</TooltipContent>
          </Tooltip>

          {playableCount > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />
              {/* Frame position counter */}
              <span className="tabular-nums text-[11px] text-muted-foreground">
                <span className={cn("font-semibold", isPlaying ? "text-primary" : "text-foreground/75")}>
                  {currentDisplay}
                </span>
                <span className="mx-0.5 opacity-40">/</span>
                {playableCount}
              </span>
            </>
          )}

          <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />

          {/* FPS slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">FPS</span>
            <Slider
              value={[fps]}
              onValueChange={([v]) => setFps(v)}
              min={MIN_FPS}
              max={MAX_FPS}
              step={1}
              className="w-20"
            />
            <span className="w-5 text-right tabular-nums text-[11px] font-semibold text-foreground/80">
              {fps}
            </span>
          </div>

          <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ZoomOutIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomReset}
                  className="h-7 min-w-11 px-2 text-[11px] tabular-nums text-muted-foreground hover:text-foreground"
                >
                  {zoomPercent}%
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset zoom</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ZoomInIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom in</TooltipContent>
            </Tooltip>
          </div>

        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────── */}
      <main
        ref={canvasViewportRef}
        className="flex min-h-0 flex-1 flex-col overflow-auto p-3"
      >
        <div
          className="flex min-h-0 flex-1"
          onDragOver={handleCanvasImageDragOver}
          onDragLeave={handleCanvasImageDragLeave}
          onDrop={handleCanvasImageDrop}
        >
          <AnimationPlayer zoom={zoom}>
            <input
              ref={blankFrameInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleBlankFrameInputChange}
            />

            {onionSkinImageUrl ? (
              <img
                src={onionSkinImageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full rounded-lg object-cover"
                style={{ opacity: onionSkinOpacity / 100 }}
              />
            ) : null}

            {isCanvasImageDragOver && showFrameActions ? (
              <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/60 bg-primary/10 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/20 bg-background/88 px-5 py-4 text-center shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <BlankFrameUploadIcon className="h-5 w-5 text-current" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">
                      {selectedFrame?.isBlank
                        ? "Drop image to fill this frame"
                        : "Drop image to replace this frame"}
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      The selected frame will update immediately.
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

          </AnimationPlayer>
        </div>
      </main>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function RotateCCWIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RotateCWIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function FlipHIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M12 20v2M12 14v2M12 8v2M12 2v2" />
    </svg>
  );
}

function FlipVIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
      <path d="M4 12H2M10 12H8M16 12h-2M22 12h-2" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

function BlankFrameUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
    >
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="m7 10 5-5 5 5" />
      <path d="M12 5v11" />
      <rect x="4" y="3" width="16" height="16" rx="2" opacity="0.3" />
    </svg>
  );
}

function SolidFillIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 11.5 12.5 5 4 13.5" />
      <path d="M5 14h9" />
      <path d="M16 16a2 2 0 1 1 4 0c0 1.5-2 3-2 3s-2-1.5-2-3Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M8 11h6" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
