import { useState, useCallback } from "react"
import { useAnimationStore } from "@/store/animation-store"
import type { Animation } from "@/types/animation"
import {
  DuplicateIcon,
  PlusIcon,
  RenameIcon,
  TrashIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ContextMenuState = {
  animId: string
  x: number
  y: number
} | null

export function AnimationsPanel() {
  const animations = useAnimationStore((s) => s.project.animations)
  const selectedAnimationId = useAnimationStore(
    (s) => s.project.selectedAnimationId
  )
  const selectAnimation = useAnimationStore((s) => s.selectAnimation)
  const addAnimation = useAnimationStore((s) => s.addAnimation)
  const removeAnimation = useAnimationStore((s) => s.removeAnimation)
  const renameAnimation = useAnimationStore((s) => s.renameAnimation)
  const duplicateAnimation = useAnimationStore((s) => s.duplicateAnimation)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>(null)

  const handleStartRename = useCallback((anim: Animation) => {
    setEditingId(anim.id)
    setEditValue(anim.name)
    setCtxMenu(null)
  }, [])

  const handleFinishRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      renameAnimation(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, renameAnimation])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, animId: string) => {
      e.preventDefault()
      e.stopPropagation()
      selectAnimation(animId)
      setCtxMenu({ animId, x: e.clientX, y: e.clientY })
    },
    [selectAnimation]
  )

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  return (
    <div className="flex h-full flex-col" onClick={closeCtxMenu}>
      {/* Header */}
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-border/40 px-2.5">
        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
          Animations
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5 text-muted-foreground/60 hover:text-foreground"
              onClick={() => addAnimation()}
            >
              <PlusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Add animation</TooltipContent>
        </Tooltip>
      </div>

      {/* Animation list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1">
          {animations.map((anim) => {
            const isSelected = selectedAnimationId === anim.id
            return (
              <div
                key={anim.id}
                onClick={() => selectAnimation(anim.id)}
                onContextMenu={(e) => handleContextMenu(e, anim.id)}
                className={cn(
                  "group flex h-7 cursor-pointer items-center gap-1.5 rounded px-2 text-xs transition-colors select-none",
                  isSelected
                    ? "bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {/* Color dot */}
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    isSelected ? "bg-primary" : "bg-muted-foreground/25"
                  )}
                />

                {/* Name (inline edit) */}
                {editingId === anim.id ? (
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename()
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="h-5 flex-1 border-none bg-transparent px-2 text-xs shadow-none"
                  />
                ) : (
                  <span className="flex-1 truncate">{anim.name}</span>
                )}

                {/* Frame count */}
                <span className="shrink-0 text-[9px] text-muted-foreground/50 tabular-nums">
                  {anim.frames.length}
                </span>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* ── Right-click context menu (portal-free, absolute) ────────────── */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={closeCtxMenu}
          onRename={() => {
            const anim = animations.find((a) => a.id === ctxMenu.animId)
            if (anim) handleStartRename(anim)
          }}
          onDuplicate={() => {
            duplicateAnimation(ctxMenu.animId)
            closeCtxMenu()
          }}
          onDelete={
            animations.length > 1
              ? () => {
                  removeAnimation(ctxMenu.animId)
                  closeCtxMenu()
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

// ── Context menu overlay ──────────────────────────────────────────────────────

function ContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDuplicate,
  onDelete,
}: {
  x: number
  y: number
  onClose: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete?: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-36 animate-in rounded-md border border-border/60 bg-popover py-1 shadow-lg fade-in-0 zoom-in-95"
        style={{ left: x, top: y }}
      >
        <CtxMenuItem icon={<RenameIcon />} label="Rename" onClick={onRename} />
        <CtxMenuItem
          icon={<DuplicateIcon />}
          label="Duplicate"
          onClick={onDuplicate}
        />
        {onDelete && (
          <>
            <div className="my-1 h-px bg-border/50" />
            <CtxMenuItem
              icon={<TrashIcon />}
              label="Delete"
              onClick={onDelete}
              destructive
            />
          </>
        )}
      </div>
    </>
  )
}

function CtxMenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent"
      )}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center opacity-70">
        {icon}
      </span>
      {label}
    </button>
  )
}
