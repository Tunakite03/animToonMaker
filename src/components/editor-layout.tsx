"use client";

import Link from "next/link";
import { AnimationPlayer } from "@/components/animation-player";
import { AnimationTimeline } from "@/components/animation-timeline";
import { FramePromptPanel } from "@/components/frame-prompt-panel";
import { Toolbar } from "@/components/toolbar";
import { ExportPanel } from "@/components/export-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnimationStore } from "@/store/animation-store";
import { useSettingsStore } from "@/store/settings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function EditorLayout() {
  const projectName = useAnimationStore((s) => s.project.name);
  const setProjectName = useAnimationStore((s) => s.setProjectName);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const isConnected = aiProvider !== "placeholder" && apiKey.length > 0;

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card/50 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm">🎬</span>
          </div>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-8 w-56 border-none bg-transparent text-sm font-semibold shadow-none focus-visible:ring-1"
          />
        </div>

        {/* Status indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="cursor-default gap-1 text-[10px]"
            >
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-green-400" : "bg-muted-foreground/50"}`} />
              {isConnected
                ? aiProvider === "fal" ? "fal.ai" : aiProvider === "replicate" ? "Replicate" : "OpenAI"
                : "No AI"
              }
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected
              ? "AI provider connected"
              : "Configure an AI provider in Settings → AI Provider"
            }
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-1">
          <ExportPanel />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link href="/settings">
                  <SettingsIcon />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* Left: Canvas + Toolbar */}
        <main className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          <AnimationPlayer />
          <Toolbar />
        </main>

        {/* Right: Prompt panel */}
        <aside className="w-80 shrink-0 overflow-auto border-l border-border bg-card/30 p-4">
          <FramePromptPanel />
        </aside>
      </div>

      {/* Bottom: Timeline */}
      <div className="shrink-0 border-t border-border bg-card/30 p-3">
        <AnimationTimeline />
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
