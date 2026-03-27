import { Link } from "react-router-dom";
import { CanvasEditor } from "@/components/canvas-editor";
import { AnimationTimeline } from "@/components/animation-timeline";
import { FramePromptPanel } from "@/components/frame-prompt-panel";
import { Toolbar } from "@/components/toolbar";
import { ExportPanel } from "@/components/export-panel";
import { ProjectLibrary } from "@/components/project-library";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnimationStore } from "@/store/animation-store";
import { useProjectLibraryStore } from "@/store/project-library-store";
import { useSettingsStore } from "@/store/settings-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function EditorLayout() {
  const projectName = useAnimationStore((s) => s.project.name);
  const setProjectName = useAnimationStore((s) => s.setProjectName);
  const toSavedProject = useAnimationStore((s) => s.toSavedProject);
  const saveProject = useProjectLibraryStore((s) => s.saveProject);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const isConnected = aiProvider !== "placeholder" && apiKey.length > 0;

  const handleQuickSave = () => {
    const saved = toSavedProject();
    saveProject(saved);
  };

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-12 items-center gap-3 border-b border-border/60 bg-card/80 px-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FilmIcon />
          </div>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-7 w-48 border-none bg-transparent text-sm font-medium shadow-none focus-visible:bg-muted focus-visible:ring-1"
          />
        </div>

        {/* Status indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="cursor-default gap-1.5 text-[10px] font-medium"
            >
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/50" : "bg-muted-foreground/50"}`} />
              {isConnected
                ? aiProvider === "fal" ? "fal.ai" : aiProvider === "replicate" ? "Replicate" : "OpenAI"
                : "No Provider"
              }
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isConnected
              ? "AI provider connected"
              : "Configure an AI provider in Settings → AI Provider"
            }
          </TooltipContent>
        </Tooltip>

        <div className="ml-auto flex items-center gap-0.5">
          <ProjectLibrary />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleQuickSave}>
                <SaveIcon />
                <span className="sr-only">Save project</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save project</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1.5 h-4" />
          <ExportPanel />
          <Separator orientation="vertical" className="mx-1.5 h-4" />
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <Link to="/settings">
                  <SettingsIcon />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Settings</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main content — vertical split: top (canvas+prompt) | bottom (timeline+toolbar) */}
      <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
        {/* Top area — horizontal split: left (canvas) | right (prompt) */}
        <ResizablePanel id="top" defaultSize="70%" minSize="40%">
          <ResizablePanelGroup orientation="horizontal">
            {/* Left: Canvas + Edit Tools */}
            <ResizablePanel id="canvas" defaultSize="70%" minSize="35%">
              <CanvasEditor />
            </ResizablePanel>

            <ResizableHandle withHandle orientation="horizontal" />

            {/* Right: Prompt panel */}
            <ResizablePanel id="prompt" defaultSize="30%" minSize="22%" maxSize="45%">
              <aside className="flex h-full flex-col overflow-hidden border-l border-border/40 bg-card/50">
                <FramePromptPanel />
              </aside>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle orientation="vertical" />

        {/* Bottom: Toolbar + Timeline */}
        <ResizablePanel id="timeline" defaultSize="30%" minSize="15%" maxSize="50%">
          <div className="flex h-full flex-col overflow-hidden">
            <Toolbar />
            <div className="min-h-0 flex-1 overflow-auto px-3 pb-2">
              <AnimationTimeline />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function FilmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
