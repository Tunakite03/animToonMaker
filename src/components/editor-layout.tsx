import { Link } from "react-router-dom"
import { CanvasEditor } from "@/components/canvas-editor"
import { AnimationTimeline } from "@/components/animation-timeline"
import { AnimationsPanel } from "@/components/animations-panel"
import { FramePromptPanel } from "@/components/frame-prompt-panel"
import { Toolbar } from "@/components/toolbar"
import { ExportPanel } from "@/components/export-panel"
import { ProjectLibrary } from "@/components/project-library"
import { ThemeToggle } from "@/components/theme-toggle"
import { FilmIcon, SaveIcon, SettingsIcon } from "@/components/icons"
import { useAnimationStore } from "@/store/animation-store"
import { useProjectLibraryStore } from "@/store/project-library-store"
import { useSettingsStore } from "@/store/settings-store"
import { useUndoShortcuts } from "@/hooks/use-undo-shortcuts"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { cn } from "@/lib/utils"

const PROVIDER_LABELS: Record<string, string> = {
  fal: "fal.ai",
  replicate: "Replicate",
  openai: "OpenAI",
  stability: "Stability",
  together: "Together",
  gemini: "Gemini",
}

export function EditorLayout() {
  const projectName = useAnimationStore((s) => s.project.name)
  const setProjectName = useAnimationStore((s) => s.setProjectName)
  const toSavedProject = useAnimationStore((s) => s.toSavedProject)
  const saveProject = useProjectLibraryStore((s) => s.saveProject)
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const apiKey = useSettingsStore((s) => s.apiKey)

  const isConnected = aiProvider !== "placeholder" && apiKey.length > 0
  const providerLabel = PROVIDER_LABELS[aiProvider] ?? aiProvider

  useUndoShortcuts()

  const handleQuickSave = () => {
    const saved = toSavedProject()
    saveProject(saved)
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      {/* ── App header ──────────────────────────────────────────────────────── */}
      <header className="relative flex h-11 shrink-0 items-center gap-0 border-b border-border/50 bg-card/95 backdrop-blur-md">
        {/* Brand section */}
        <div className="flex h-full items-center gap-3 border-r border-border/40 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary shadow-[0_0_10px_-2px] shadow-primary/40">
              <FilmIcon size={13} />
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
              "transition-colors"
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
                    : "text-muted-foreground/60 hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    isConnected
                      ? "bg-emerald-400 shadow-[0_0_5px_1px] shadow-emerald-400/50"
                      : "bg-muted-foreground/30"
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
            <ResizablePanel
              id="timeline"
              defaultSize="30%"
              minSize="16%"
              maxSize="50%"
            >
              <div className="flex h-full flex-col overflow-hidden bg-card/30">
                <Toolbar />
                <div className="min-h-0 flex-1 overflow-hidden px-2 pt-1 pb-2">
                  <AnimationTimeline />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle orientation="horizontal" />

        {/* Right sidebar: Frame prompt (top) + Animations list (bottom) */}
        <ResizablePanel
          id="right-sidebar"
          defaultSize="30%"
          minSize="20%"
          maxSize="45%"
        >
          <aside className="flex h-full flex-col overflow-hidden border-l border-border/50 bg-card/50">
            <ResizablePanelGroup orientation="vertical">
              {/* Frame editor / prompt panel */}
              <ResizablePanel id="frame-editor" defaultSize="55%" minSize="25%">
                <FramePromptPanel />
              </ResizablePanel>

              <ResizableHandle withHandle orientation="vertical" />

              {/* Animations list */}
              <ResizablePanel
                id="anims-list"
                defaultSize="30%"
                minSize="15%"
                maxSize="40%"
              >
                <AnimationsPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
