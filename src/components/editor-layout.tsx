import { Link } from "react-router-dom";
import { CanvasEditor } from "@/components/canvas-editor";
import { AnimationTimeline } from "@/components/animation-timeline";
import { AnimationsPanel } from "@/components/animations-panel";
import { FramePromptPanel } from "@/components/frame-prompt-panel";
import { Toolbar } from "@/components/toolbar";
import { ExportPanel } from "@/components/export-panel";
import { ProjectLibrary } from "@/components/project-library";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnimationStore } from "@/store/animation-store";
import { useProjectLibraryStore } from "@/store/project-library-store";
import { useSettingsStore } from "@/store/settings-store";
import { useUndoShortcuts } from "@/hooks/use-undo-shortcuts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  fal: "fal.ai",
  replicate: "Replicate",
  openai: "OpenAI",
  stability: "Stability",
  together: "Together",
  gemini: "Gemini",
};

export function EditorLayout() {
  const projectName = useAnimationStore((s) => s.project.name);
  const setProjectName = useAnimationStore((s) => s.setProjectName);
  const toSavedProject = useAnimationStore((s) => s.toSavedProject);
  const saveProject = useProjectLibraryStore((s) => s.saveProject);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const isConnected = aiProvider !== "placeholder" && apiKey.length > 0;
  const providerLabel = PROVIDER_LABELS[aiProvider] ?? aiProvider;

  useUndoShortcuts();

  const handleQuickSave = () => {
    const saved = toSavedProject();
    saveProject(saved);
  };

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* ── App header ──────────────────────────────────────────────────────── */}
      <header className="relative flex h-11 shrink-0 items-center gap-0 border-b border-border/50 bg-card/95 backdrop-blur-md">

        {/* Brand section */}
        <div className="flex h-full items-center gap-3 border-r border-border/40 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary shadow-[0_0_10px_-2px] shadow-primary/40">
              <FilmIcon />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-foreground/90">
              AnimToon
            </span>
          </div>
        </div>

        {/* Project name — editable */}
        <div className="flex h-full items-center gap-2 border-r border-border/40 px-3">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className={cn(
              "h-7 w-44 border-transparent bg-transparent text-sm font-medium shadow-none",
              "placeholder:text-muted-foreground/40",
              "hover:border-border/60 hover:bg-muted/40",
              "focus-visible:border-border/80 focus-visible:bg-muted/60 focus-visible:ring-0",
              "transition-colors",
            )}
            placeholder="Untitled project"
          />
        </div>

        {/* AI provider status */}
        <div className="flex h-full items-center px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  isConnected
                    ? "text-emerald-500 hover:bg-emerald-500/8"
                    : "text-muted-foreground/60 hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_5px_1px] shadow-emerald-400/50"
                      : "bg-muted-foreground/30",
                  )}
                />
                {isConnected ? providerLabel : "No AI"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {isConnected
                ? `Connected to ${providerLabel}`
                : "No AI provider — go to Settings → AI Provider"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex h-full items-center border-l border-border/40 px-2">
          {/* Project library */}
          <ProjectLibrary />

          {/* Quick save */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleQuickSave}>
                <SaveIcon />
                <span className="sr-only">Save project</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Save project</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />

          {/* Export */}
          <ExportPanel />

          <Separator orientation="vertical" className="mx-1.5 h-4 opacity-60" />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Settings */}
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

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">

        {/* Top row: Canvas + Right sidebar (Frame editor on top, Animations below) */}
        <ResizablePanel id="top" defaultSize="70%" minSize="40%">
          <ResizablePanelGroup orientation="vertical">

            {/* Canvas */}
            <ResizablePanel id="canvas" defaultSize="70%" minSize="35%">
              <CanvasEditor />
            </ResizablePanel>



        <ResizableHandle withHandle orientation="vertical" />

        {/* Bottom: Toolbar + Timeline (frames of selected animation) */}
        <ResizablePanel id="timeline" defaultSize="30%" minSize="16%" maxSize="50%">
          <div className="flex h-full flex-col overflow-hidden bg-card/30">
            <Toolbar />
            <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 pt-1">
              <AnimationTimeline />
            </div>
          </div>
        </ResizablePanel>


          </ResizablePanelGroup>
        </ResizablePanel>

            <ResizableHandle withHandle orientation="horizontal" />

            {/* Right sidebar: Frame prompt (top) + Animations list (bottom) */}
            <ResizablePanel id="right-sidebar" defaultSize="30%" minSize="20%" maxSize="45%">
              <aside className="flex h-full flex-col overflow-hidden border-l border-border/50 bg-card/50">
                <ResizablePanelGroup orientation="vertical">
                  {/* Frame editor / prompt panel */}
                  <ResizablePanel id="frame-editor" defaultSize="55%" minSize="25%">
                    <FramePromptPanel />
                  </ResizablePanel>

                  <ResizableHandle withHandle orientation="vertical" />

                  {/* Animations list */}
                  <ResizablePanel id="anims-list" defaultSize="45%" minSize="20%">
                    <AnimationsPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </aside>
            </ResizablePanel>




      </ResizablePanelGroup>
    </div>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────────

function FilmIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SaveIcon() {
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
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
