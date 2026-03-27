import { useRef } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAX_FRAMES } from "@/lib/constants";
import { processImageFiles } from "@/lib/import-utils";

export function Toolbar() {
  const frames = useAnimationStore((s) => s.project.frames);
  const addFrame = useAnimationStore((s) => s.addFrame);
  const addFrameWithImage = useAnimationStore((s) => s.addFrameWithImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = frames.length;
  const atMax = totalCount >= MAX_FRAMES;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    await processImageFiles(Array.from(fileList), frames.length, addFrameWithImage);
    // Reset so the same file(s) can be selected again
    e.target.value = "";
  };

  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 bg-card/70 px-2.5">

      {/* ── Add frame dropdown ──────────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={atMax}
            className="h-6 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <PlusIcon />
            Add Frame
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-52">
          {/* Import from file — primary action */}
          <DropdownMenuItem
            className="gap-2 text-xs"
            disabled={atMax}
            onSelect={() => fileInputRef.current?.click()}
          >
            <FolderImageIcon />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Import image file(s)…</span>
              <span className="text-[10px] text-muted-foreground">
                Add frames from local images
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Add blank frame — secondary action */}
          <DropdownMenuItem
            className="gap-2 text-xs"
            disabled={atMax}
            onSelect={() => addFrame()}
          >
            <BlankFrameIcon />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Add blank frame</span>
              <span className="text-[10px] text-muted-foreground">
                Transparent placeholder frame
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input — triggered by the dropdown item above */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {/* ── Frame count badge (right-aligned) ──────────────────────────── */}
      <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <span className="tabular-nums font-medium text-muted-foreground">
          {totalCount}
        </span>
        <span>/</span>
        <span>{MAX_FRAMES}</span>
        <span className="ml-0.5">frames</span>
      </div>
    </div>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-60"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function FolderImageIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary"
    >
      <path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1" />
      <circle cx="8" cy="15" r="2" />
      <path d="m10.5 17 1.937-1.5L15 17l3-4" />
    </svg>
  );
}

function BlankFrameIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-muted-foreground"
    >
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
}
