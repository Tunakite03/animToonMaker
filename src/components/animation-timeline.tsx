"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAnimationStore } from "@/store/animation-store";
import type { Frame } from "@/types/animation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MAX_FRAMES } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function SortableFrame({
  frame,
  index,
  isSelected,
  isCurrent,
  onSelect,
  onDelete,
}: {
  frame: Frame;
  index: number;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(frame.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(frame.id)}
      className={cn(
        "group/frame relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border transition-all duration-150",
        isSelected
          ? "border-primary ring-2 ring-primary/25 shadow-sm shadow-primary/10"
          : "border-border/50 hover:border-primary/40",
        isCurrent && !isSelected && "border-accent-foreground/30",
        isDragging && "opacity-40 scale-95",
      )}
    >
      {/* Frame image or placeholder */}
      {frame.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frame.imageUrl}
          alt={`Frame ${index + 1}`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/60 text-xs text-muted-foreground">
          {frame.status === "generating" ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : frame.status === "error" ? (
            <span className="text-[10px] text-destructive">Error</span>
          ) : (
            <span className="text-[10px]">Empty</span>
          )}
        </div>
      )}

      {/* Frame index */}
      <div className="absolute bottom-0.5 left-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-black/60 px-0.5 text-[9px] font-medium text-white">
        {index + 1}
      </div>

      {/* Status dot */}
      {frame.status !== "idle" && (
        <div className={cn(
          "absolute top-1 right-1 h-2 w-2 rounded-full",
          frame.status === "done" && "bg-emerald-400",
          frame.status === "generating" && "bg-amber-400 animate-pulse",
          frame.status === "error" && "bg-red-400",
        )} />
      )}

      {/* Delete button — visible on hover */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDelete}
            className="absolute top-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-sm bg-destructive/90 text-white opacity-0 transition-opacity hover:bg-destructive group-hover/frame:opacity-100"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">Delete frame</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function AnimationTimeline() {
  const frames = useAnimationStore((s) => s.project.frames);
  const selectedFrameId = useAnimationStore((s) => s.project.selectedFrameId);
  const currentFrameIndex = useAnimationStore(
    (s) => s.playback.currentFrameIndex,
  );
  const selectFrame = useAnimationStore((s) => s.selectFrame);
  const reorderFrames = useAnimationStore((s) => s.reorderFrames);
  const removeFrame = useAnimationStore((s) => s.removeFrame);
  const addFrameWithImage = useAnimationStore((s) => s.addFrameWithImage);

  const [isDragOver, setIsDragOver] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const frameIds = useMemo(() => frames.map((f) => f.id), [frames]);

  const playableFrames = useMemo(
    () => frames.filter((f) => f.imageUrl),
    [frames],
  );

  const currentPlayableId = playableFrames[currentFrameIndex]?.id;

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = frames.findIndex((f) => f.id === active.id);
      const to = frames.findIndex((f) => f.id === over.id);
      if (from !== -1 && to !== -1) {
        reorderFrames(from, to);
      }
    },
    [frames, reorderFrames],
  );

  const handleDeleteFrame = useCallback(
    (id: string) => {
      removeFrame(id);
    },
    [removeFrame],
  );

  const handleExternalDragOver = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      }
    },
    [],
  );

  const handleExternalDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragOver(false);
    },
    [],
  );

  const handleExternalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length === 0) return;

      const remaining = MAX_FRAMES - frames.length;
      const toAdd = files.slice(0, remaining);

      for (const file of toAdd) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          addFrameWithImage(dataUrl, file.name.replace(/\.[^.]+$/, ""));
        };
        reader.readAsDataURL(file);
      }
    },
    [frames.length, addFrameWithImage],
  );

  if (frames.length === 0) {
    return (
      <div
        onDragOver={handleExternalDragOver}
        onDragLeave={handleExternalDragLeave}
        onDrop={handleExternalDrop}
        className={cn(
          "flex h-full min-h-[88px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground transition-colors",
          isDragOver
            ? "border-primary bg-primary/5 text-primary"
            : "border-border/50 bg-muted/10",
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
          <span className="text-xs">
            {isDragOver
              ? "Drop images to add frames"
              : "No frames yet — add a frame or drop images here"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
      className={cn(
        "relative h-full transition-colors",
        isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg",
      )}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-primary">
            <span className="text-base">+</span>
            <span className="text-xs">Drop images to add frames</span>
          </div>
        </div>
      )}
      <ScrollArea className="h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={frameIds} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-1.5 p-1">
              {frames.map((frame, idx) => (
                <SortableFrame
                  key={frame.id}
                  frame={frame}
                  index={idx}
                  isSelected={frame.id === selectedFrameId}
                  isCurrent={frame.id === currentPlayableId}
                  onSelect={selectFrame}
                  onDelete={handleDeleteFrame}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
}
