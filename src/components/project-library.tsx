import { useState, useCallback } from "react";
import { useAnimationStore } from "@/store/animation-store";
import { useProjectLibraryStore } from "@/store/project-library-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ProjectLibrary() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const projects = useProjectLibraryStore((s) => s.projects);
  const deleteProject = useProjectLibraryStore((s) => s.deleteProject);
  const saveProject = useProjectLibraryStore((s) => s.saveProject);
  const currentProjectId = useAnimationStore((s) => s.project.id);
  const toSavedProject = useAnimationStore((s) => s.toSavedProject);
  const loadProject = useAnimationStore((s) => s.loadProject);
  const newProject = useAnimationStore((s) => s.newProject);

  const filtered = search.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  const handleSaveCurrent = useCallback(() => {
    const saved = toSavedProject();
    saveProject(saved);
  }, [toSavedProject, saveProject]);

  const handleLoad = useCallback(
    (id: string) => {
      // Auto-save current project before loading
      const current = toSavedProject();
      if (current.frames.length > 0) {
        saveProject(current);
      }
      const project = useProjectLibraryStore.getState().getProject(id);
      if (project) {
        loadProject(project);
        setOpen(false);
      }
    },
    [toSavedProject, saveProject, loadProject],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteProject(id);
      setConfirmDeleteId(null);
    },
    [deleteProject],
  );

  const handleNewProject = useCallback(() => {
    // Auto-save current project before creating new
    const current = toSavedProject();
    if (current.frames.length > 0) {
      saveProject(current);
    }
    newProject();
    setOpen(false);
  }, [toSavedProject, saveProject, newProject]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <FolderIcon />
              <span className="sr-only">Projects</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Projects</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Animation Projects</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 flex-1 text-sm"
          />
          <Button size="sm" variant="outline" onClick={handleNewProject}>
            <PlusIcon />
            New
          </Button>
          <Button size="sm" onClick={handleSaveCurrent}>
            <SaveIcon />
            Save
          </Button>
        </div>

        <Separator />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <EmptyIcon />
            <p className="text-sm">
              {search.trim()
                ? "No projects match your search"
                : "No saved projects yet"}
            </p>
            {!search.trim() && (
              <p className="text-xs">
                Click &quot;Save&quot; to save your current animation
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-1.5 pr-3">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border hover:bg-accent/50",
                    project.id === currentProjectId &&
                      "border-primary/30 bg-primary/5",
                  )}
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {project.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnailUrl}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <FilmIcon />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {project.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.frameCount} frame{project.frameCount !== 1 ? "s" : ""} ·{" "}
                      {project.fps} FPS ·{" "}
                      {formatDate(project.savedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {project.id !== currentProjectId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleLoad(project.id)}
                          >
                            <LoadIcon />
                            <span className="sr-only">Load</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Load project</TooltipContent>
                      </Tooltip>
                    )}

                    {confirmDeleteId === project.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => handleDelete(project.id)}
                        >
                          <CheckIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setConfirmDeleteId(project.id)}
                          >
                            <TrashIcon />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete project</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

// --- Inline SVG icons ---

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 7h.01" />
      <path d="M17 7h.01" />
      <path d="M7 17h.01" />
      <path d="M17 17h.01" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

function LoadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
