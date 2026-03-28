"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ColorFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  swatches?: string[]
}

type DragMode = "sv" | "hue"

const DEFAULT_SWATCHES = [
  "#0f172a",
  "#1d4ed8",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#ca8a04",
  "#dc2626",
  "#c026d3",
]

export function ColorField({
  value,
  onChange,
  disabled,
  className,
  swatches = DEFAULT_SWATCHES,
}: ColorFieldProps) {
  const normalizedValue = React.useMemo(
    () => normalizeHex(value, "#8080a8"),
    [value]
  )
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(normalizedValue)
  const [hexInput, setHexInput] = React.useState(normalizedValue.toUpperCase())
  const dragModeRef = React.useRef<DragMode | null>(null)
  const svRef = React.useRef<HTMLDivElement>(null)
  const hueRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) {
      setDraft(normalizedValue)
      setHexInput(normalizedValue.toUpperCase())
    }
  }, [normalizedValue, open])

  const draftHsv = React.useMemo(() => hexToHsv(draft), [draft])

  const syncDraft = React.useCallback((nextHex: string) => {
    setDraft(nextHex)
    setHexInput(nextHex.toUpperCase())
  }, [])

  const commitDraft = React.useCallback(
    (nextHex: string) => {
      const normalized = normalizeHex(nextHex, draft)
      syncDraft(normalized)
      if (normalized !== normalizedValue) {
        onChange(normalized)
      }
    },
    [draft, normalizedValue, onChange, syncDraft]
  )

  const updateFromPointer = React.useCallback(
    (mode: DragMode, clientX: number, clientY: number, commit: boolean) => {
      const sourceRef = mode === "sv" ? svRef : hueRef
      const rect = sourceRef.current?.getBoundingClientRect()
      if (!rect) return

      let nextHex = draft

      if (mode === "sv") {
        const saturation = clamp((clientX - rect.left) / rect.width, 0, 1)
        const valueLevel = 1 - clamp((clientY - rect.top) / rect.height, 0, 1)
        nextHex = hsvToHex(draftHsv.h, saturation, valueLevel)
      } else {
        const hue = clamp((clientX - rect.left) / rect.width, 0, 1) * 360
        nextHex = hsvToHex(hue, draftHsv.s, draftHsv.v)
      }

      syncDraft(nextHex)
      if (commit) {
        commitDraft(nextHex)
      }
    },
    [commitDraft, draft, draftHsv.h, draftHsv.s, draftHsv.v, syncDraft]
  )

  React.useEffect(() => {
    if (!open) return

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragModeRef.current) return
      updateFromPointer(
        dragModeRef.current,
        event.clientX,
        event.clientY,
        false
      )
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragModeRef.current) return
      updateFromPointer(dragModeRef.current, event.clientX, event.clientY, true)
      dragModeRef.current = null
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [open, updateFromPointer])

  const handleSurfacePointerDown =
    (mode: DragMode) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return
      dragModeRef.current = mode
      updateFromPointer(mode, event.clientX, event.clientY, false)
    }

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      commitDraft(hexInput)
      return
    }

    setHexInput(draft.toUpperCase())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("flex items-center gap-2", className)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-9 w-10 shrink-0 rounded-xl border-border/70 p-0 shadow-sm"
          >
            <span
              className="h-full w-full rounded-[inherit]"
              style={{ backgroundColor: draft }}
            />
          </Button>
        </PopoverTrigger>

        <Input
          value={hexInput}
          onChange={(event) => setHexInput(event.target.value.toUpperCase())}
          onBlur={handleHexBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleHexBlur()
              event.currentTarget.blur()
            }
          }}
          spellCheck={false}
          disabled={disabled}
          className="h-9 w-28 font-mono text-xs uppercase"
        />
      </div>

      <PopoverContent align="end" side="bottom" className="w-80 rounded-2xl p-3">
        <div className="space-y-3">
          <div
            ref={svRef}
            onPointerDown={handleSurfacePointerDown("sv")}
            className="relative h-40 cursor-crosshair overflow-hidden rounded-xl border border-border/60"
            style={{
              backgroundColor: `hsl(${draftHsv.h} 100% 50%)`,
              backgroundImage:
                "linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)",
            }}
          >
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
              style={{
                left: `${draftHsv.s * 100}%`,
                top: `${(1 - draftHsv.v) * 100}%`,
              }}
            />
          </div>

          <div
            ref={hueRef}
            onPointerDown={handleSurfacePointerDown("hue")}
            className="relative h-4 cursor-ew-resize rounded-full border border-border/60"
            style={{
              background:
                "linear-gradient(90deg, #ef4444 0%, #f59e0b 17%, #84cc16 33%, #14b8a6 50%, #3b82f6 67%, #8b5cf6 83%, #ef4444 100%)",
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(15,23,42,0.45)]"
              style={{ left: `${(draftHsv.h / 360) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/25 p-2.5">
            <div
              className="h-10 w-10 shrink-0 rounded-xl border border-border/70 shadow-sm"
              style={{ backgroundColor: draft }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Selected
              </div>
              <div className="mt-1 font-mono text-sm font-semibold uppercase">
                {draft}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {swatches.map((swatch) => {
              const normalizedSwatch = normalizeHex(swatch, swatch)
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => commitDraft(normalizedSwatch)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                    draft === normalizedSwatch
                      ? "border-foreground shadow-sm"
                      : "border-white/80"
                  )}
                  style={{ backgroundColor: normalizedSwatch }}
                  aria-label={`Use ${normalizedSwatch} color`}
                />
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isValidHex(value: string) {
  return /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.test(value.trim())
}

function normalizeHex(value: string, fallback: string) {
  const trimmed = value.trim()
  if (!isValidHex(trimmed)) return fallback

  let normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (normalized.length === 4) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
  }

  return normalized.toLowerCase()
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, "#000000")
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`
}

function hexToHsv(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let hue = 0
  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6)
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2)
    } else {
      hue = 60 * ((red - green) / delta + 4)
    }
  }

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  }
}

function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 360) + 360) % 360
  const chroma = v * s
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const match = v - chroma

  let red = 0
  let green = 0
  let blue = 0

  if (hue < 60) {
    red = chroma
    green = x
  } else if (hue < 120) {
    red = x
    green = chroma
  } else if (hue < 180) {
    green = chroma
    blue = x
  } else if (hue < 240) {
    green = x
    blue = chroma
  } else if (hue < 300) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  return rgbToHex(
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255
  )
}
