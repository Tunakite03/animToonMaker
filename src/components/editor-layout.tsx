"use client";

import { AnimationPlayer } from "@/components/animation-player";
import { AnimationTimeline } from "@/components/animation-timeline";
import { FramePromptPanel } from "@/components/frame-prompt-panel";
import { Toolbar } from "@/components/toolbar";
import { ExportPanel } from "@/components/export-panel";
import { useAnimationStore } from "@/store/animation-store";
import { Input } from "@/components/ui/input";

export function EditorLayout() {
  const projectName = useAnimationStore((s) => s.project.name);
  const setProjectName = useAnimationStore((s) => s.setProjectName);

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-8 w-56 border-none bg-transparent text-sm font-semibold shadow-none focus-visible:ring-1"
          />
        </div>
        <div className="ml-auto">
          <ExportPanel />
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* Left: Canvas */}
        <main className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          <AnimationPlayer />
          <Toolbar />
        </main>

        {/* Right: Prompt panel */}
        <aside className="w-80 shrink-0 overflow-auto border-l border-border p-4">
          <FramePromptPanel />
        </aside>
      </div>

      {/* Bottom: Timeline */}
      <div className="shrink-0 border-t border-border p-3">
        <AnimationTimeline />
      </div>
    </div>
  );
}
