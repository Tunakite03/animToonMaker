"use client";

import { useCallback, useMemo } from "react";
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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAnimationStore } from "@/store/animation-store";
import type { Frame } from "@/types/animation";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function SortableFrame({
  frame,
  index,
  isSelected,
  isCurrent,
  onSelect,
}: {
  frame: Frame;
  index: number;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: (id: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(frame.id)}
      className={cn(
        "group relative flex h-[88px] w-[88px] shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 transition-all",
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/50",
        isCurrent && !isSelected && "border-accent-foreground/40",
        isDragging && "opacity-50",
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
        <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          {frame.status === "generating" ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : frame.status === "error" ? (
            <span className="text-destructive">Error</span>
          ) : (
            <span>Empty</span>
          )}
        </div>
      )}

      {/* Frame index badge */}
      <Badge
        variant="secondary"
        className="absolute bottom-1 left-1 h-5 min-w-5 justify-center px-1 text-[10px]"
      >
        {index + 1}
      </Badge>

      {/* Status indicator */}
      {frame.status === "generating" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const frameIds = useMemo(() => frames.map((f) => f.id), [frames]);

  // Find the index of the current playback frame among all frames
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

  if (frames.length === 0) {
    return (
      <div className="flex h-[104px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No frames yet. Add a frame to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="w-full rounded-xl border border-border bg-card p-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={frameIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 pb-2">
            {frames.map((frame, idx) => (
              <SortableFrame
                key={frame.id}
                frame={frame}
                index={idx}
                isSelected={frame.id === selectedFrameId}
                isCurrent={frame.id === currentPlayableId}
                onSelect={selectFrame}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
