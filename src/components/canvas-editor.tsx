import { useCallback, useState, useRef, useEffect } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { AnimationPlayer } from "@/components/animation-player";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { rotateImage, flipImage, removeBackground } from "@/lib/image-utils";

const KEYPOINT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

type EditMode = "select" | "keypoint";

export function CanvasEditor() {
  const selectedFrame = useAnimationStore((s) => {
    const { frames, selectedFrameId } = s.project;
    return frames.find((f) => f.id === selectedFrameId) ?? null;
  });
  const isPlaying = useAnimationStore((s) => s.playback.isPlaying);
  const updateFrame = useAnimationStore((s) => s.updateFrame);
  const addKeypoint = useAnimationStore((s) => s.addKeypoint);
  const updateKeypoint = useAnimationStore((s) => s.updateKeypoint);
  const removeKeypoint = useAnimationStore((s) => s.removeKeypoint);

  const [editMode, setEditMode] = useState<EditMode>("select");
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const hasImage = !!selectedFrame?.imageUrl;
  const showTools = !isPlaying && hasImage;
  const showOverlay = !isPlaying && hasImage;
  const keypoints = selectedFrame?.keypoints ?? [];

  // --- Image transforms ---

  const handleRotate = useCallback(
    async (degrees: 90 | -90) => {
      if (!selectedFrame?.imageUrl || isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await rotateImage(selectedFrame.imageUrl, degrees);
        updateFrame(selectedFrame.id, { imageUrl: result });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFrame, updateFrame, isProcessing],
  );

  const handleFlip = useCallback(
    async (horizontal: boolean) => {
      if (!selectedFrame?.imageUrl || isProcessing) return;
      setIsProcessing(true);
      try {
        const result = await flipImage(selectedFrame.imageUrl, horizontal);
        updateFrame(selectedFrame.id, { imageUrl: result });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedFrame, updateFrame, isProcessing],
  );

  const handleRemoveBg = useCallback(async () => {
    if (!selectedFrame?.imageUrl || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await removeBackground(selectedFrame.imageUrl);
      updateFrame(selectedFrame.id, { imageUrl: result });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFrame, updateFrame, isProcessing]);

  // --- Keypoints ---

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editMode !== "keypoint" || !selectedFrame) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const colorIdx = keypoints.length % KEYPOINT_COLORS.length;
      addKeypoint(selectedFrame.id, {
        id: nanoid(),
        x,
        y,
        label: `P${keypoints.length + 1}`,
        color: KEYPOINT_COLORS[colorIdx],
      });
    },
    [editMode, selectedFrame, keypoints.length, addKeypoint],
  );

  const handleKeypointMouseDown = useCallback(
    (e: React.MouseEvent, kpId: string) => {
      e.stopPropagation();
      setDraggingId(kpId);
    },
    [],
  );

  const handleKeypointDeleteClick = useCallback(
    (e: React.MouseEvent, kpId: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (!selectedFrame) return;
      removeKeypoint(selectedFrame.id, kpId);
    },
    [selectedFrame, removeKeypoint],
  );

  // Window-level drag handlers
  useEffect(() => {
    if (!draggingId || !selectedFrame) return;

    const handleMouseMove = (e: MouseEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const y = Math.max(
        0,
        Math.min(1, (e.clientY - rect.top) / rect.height),
      );
      updateKeypoint(selectedFrame.id, draggingId, { x, y });
    };

    const handleMouseUp = () => setDraggingId(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, selectedFrame, updateKeypoint]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Edit toolbar */}
      {showTools && (
        <div className="flex items-center gap-1 border-b border-border/40 bg-card/60 px-3 py-1.5 backdrop-blur-sm">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setEditMode("select")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
                    editMode === "select"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CursorIcon />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Select & Move</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setEditMode("keypoint")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
                    editMode === "keypoint"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CrosshairIcon />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Add Keypoint</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Transform buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleRotate(-90)}
                disabled={isProcessing}
              >
                <RotateCCWIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rotate Left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleRotate(90)}
                disabled={isProcessing}
              >
                <RotateCWIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rotate Right</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleFlip(true)}
                disabled={isProcessing}
              >
                <FlipHIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flip Horizontal</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => handleFlip(false)}
                disabled={isProcessing}
              >
                <FlipVIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flip Vertical</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Remove BG */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemoveBg}
                disabled={isProcessing}
                className="gap-1.5 text-xs"
              >
                {isProcessing ? <SpinnerIcon /> : <EraserIcon />}
                Remove BG
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Remove background (flood fill from edges)
            </TooltipContent>
          </Tooltip>

          {/* Keypoint count */}
          {keypoints.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <span className="text-[10px] text-muted-foreground">
                {keypoints.length} pt{keypoints.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      )}

      {/* Canvas area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
        <AnimationPlayer>
          {showOverlay && (
            <div
              ref={overlayRef}
              className={cn(
                "absolute inset-0 z-10 rounded-lg",
                editMode === "keypoint"
                  ? "cursor-crosshair"
                  : "pointer-events-none",
              )}
              onClick={handleOverlayClick}
            >
              {keypoints.map((kp) => (
                <div
                  key={kp.id}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${kp.x * 100}%`,
                    top: `${kp.y * 100}%`,
                  }}
                  onMouseDown={(e) => handleKeypointMouseDown(e, kp.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="group relative">
                    {/* Keypoint dot */}
                    <div
                      className={cn(
                        "h-3.5 w-3.5 rounded-full border-2 border-white shadow-md transition-transform",
                        draggingId === kp.id
                          ? "scale-125 cursor-grabbing"
                          : "cursor-grab hover:scale-110",
                      )}
                      style={{ backgroundColor: kp.color }}
                    />
                    {/* Label */}
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium text-white">
                      {kp.label}
                    </span>
                    {/* Delete on hover */}
                    <button
                      onClick={(e) => handleKeypointDeleteClick(e, kp.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg
                        width="7"
                        height="7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimationPlayer>
      </main>
    </div>
  );
}

// --- Icons ---

function CursorIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M22 12h-4" />
      <path d="M6 12H2" />
      <path d="M12 6V2" />
      <path d="M12 22v-4" />
    </svg>
  );
}

function RotateCCWIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RotateCWIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function FlipHIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M12 20v2" />
      <path d="M12 14v2" />
      <path d="M12 8v2" />
      <path d="M12 2v2" />
    </svg>
  );
}

function FlipVIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
      <path d="M4 12H2" />
      <path d="M10 12H8" />
      <path d="M16 12h-2" />
      <path d="M22 12h-2" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
