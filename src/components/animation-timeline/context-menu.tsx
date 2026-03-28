import { forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CloseMenuIcon } from "@/components/icons"

const timelineContextMenuItemBase =
  "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"

type TimelineContextMenuProps = {
  children: ReactNode
  left: number
  top: number
  title: string
  onClose: () => void
}

export type TimelineMenuState = {
  frameId: string | null
  x: number
  y: number
}

export const TimelineContextMenu = forwardRef<
  HTMLDivElement,
  TimelineContextMenuProps
>(({ children, left, top, title, onClose }, ref) => {
  return (
    <div
      ref={ref}
      role="menu"
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "fixed z-50 w-64 rounded-2xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl",
        "ring-1 ring-black/5"
      )}
      style={{ left, top }}
    >
      <div className="flex items-center justify-between px-2.5 pt-1 pb-1">
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close timeline menu"
        >
          <CloseMenuIcon />
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
})

TimelineContextMenu.displayName = "TimelineContextMenu"

export function TimelineContextMenuItem({
  label,
  description,
  icon,
  disabled = false,
  onClick,
  tone = "default",
}: {
  label: string
  description: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
  tone?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        timelineContextMenuItemBase,
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10 disabled:text-destructive/50"
          : "text-foreground hover:bg-accent disabled:text-muted-foreground/45",
        "disabled:cursor-not-allowed disabled:hover:bg-transparent"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          tone === "danger"
            ? "border-destructive/15 bg-destructive/10"
            : "border-border/60 bg-background/80"
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[11px] leading-none font-medium">{label}</span>
        <span
          className={cn(
            "text-[10px] leading-snug",
            tone === "danger" ? "text-destructive/75" : "text-muted-foreground"
          )}
        >
          {description}
        </span>
      </span>
    </button>
  )
}

export function TimelineContextMenuDivider() {
  return <div className="my-1 h-px bg-border/70" />
}
