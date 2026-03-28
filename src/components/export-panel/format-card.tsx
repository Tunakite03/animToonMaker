import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormatCardProps {
  title: string
  description: string
  icon: ReactNode
  selected?: boolean
  disabled?: boolean
  badge?: string
  onSelect: () => void
}

export function FormatCard({
  title,
  description,
  icon,
  selected = false,
  disabled = false,
  badge,
  onSelect,
}: FormatCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-primary/70 bg-primary/8 shadow-[0_0_0_1px] shadow-primary/20"
          : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          selected
            ? "border-primary/40 bg-primary/12 text-primary"
            : "border-border/60 bg-background/80 text-muted-foreground"
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}
