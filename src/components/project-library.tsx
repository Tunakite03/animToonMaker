import { useState, useCallback } from "react"
import { useAnimationStore } from "@/store/animation-store"
import { useProjectLibraryStore } from "@/store/project-library-store"
import {
  CheckIcon,
  EmptyIcon,
  FilmIcon,
  FolderIcon,
  LoadIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function ProjectLibrary() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const projects = useProjectLibraryStore((s) => s.projects)
  const deleteProject = useProjectLibraryStore((s) => s.deleteProject)
  const saveProject = useProjectLibraryStore((s) => s.saveProject)
  const currentProjectId = useAnimationStore((s) => s.project.id)
  const toSavedProject = useAnimationStore((s) => s.toSavedProject)
  const loadProject = useAnimationStore((s) => s.loadProject)
  const newProject = useAnimationStore((s) => s.newProject)

  const filtered = search.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : projects

  const handleLoad = useCallback(
    (id: string) => {
      // Auto-save current project before loading
      const current = toSavedProject()
      if (current.frameCount > 0) {
        saveProject(current)
      }
      const project = useProjectLibraryStore.getState().getProject(id)
      if (project) {
        loadProject(project)
        setOpen(false)
      }
    },
    [toSavedProject, saveProject, loadProject]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteProject(id)
      setConfirmDeleteId(null)
    },
    [deleteProject]
  )

  const handleNewProject = useCallback(() => {
    // Auto-save current project before creating new
    const current = toSavedProject()
    if (current.frameCount > 0) {
      saveProject(current)
    }
    newProject()
    setOpen(false)
  }, [toSavedProject, saveProject, newProject])

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
                      "border-primary/30 bg-primary/5"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {project.thumbnailUrl ? (
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
                      {project.frameCount} frame
                      {project.frameCount !== 1 ? "s" : ""} · {project.fps} FPS
                      · {formatDate(project.savedAt)}
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
  )
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}
