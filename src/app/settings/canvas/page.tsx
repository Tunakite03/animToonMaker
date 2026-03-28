import { useSettingsStore, type CanvasQuality } from "@/store/settings-store"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ColorField } from "@/components/ui/color-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LinkIcon } from "@/components/icons"

const presets = [
  { w: 128, h: 128, label: "128²", ratio: "1:1" },

  { w: 256, h: 256, label: "256²", ratio: "1:1" },
  { w: 512, h: 512, label: "512²", ratio: "1:1" },
  { w: 768, h: 768, label: "768²", ratio: "1:1" },
  { w: 1024, h: 1024, label: "1024²", ratio: "1:1" },
  { w: 1024, h: 576, label: "1024 × 576", ratio: "16:9" },
  { w: 576, h: 1024, label: "576 × 1024", ratio: "9:16" },
]

const qualityOptions: { value: CanvasQuality; label: string; desc: string }[] =
  [
    { value: "low", label: "Low", desc: "Fastest rendering" },
    { value: "medium", label: "Medium", desc: "Balanced" },
    { value: "high", label: "High", desc: "Best quality" },
  ]

export default function CanvasSettingsPage() {
  const width = useSettingsStore((s) => s.canvasWidth)
  const height = useSettingsStore((s) => s.canvasHeight)
  const bg = useSettingsStore((s) => s.canvasBackground)
  const quality = useSettingsStore((s) => s.canvasQuality)
  const showGrid = useSettingsStore((s) => s.showGrid)
  const setWidth = useSettingsStore((s) => s.setCanvasWidth)
  const setHeight = useSettingsStore((s) => s.setCanvasHeight)
  const setBg = useSettingsStore((s) => s.setCanvasBackground)
  const setQuality = useSettingsStore((s) => s.setCanvasQuality)
  const setShowGrid = useSettingsStore((s) => s.setShowGrid)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Canvas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure canvas dimensions, background, and rendering quality.
        </p>
      </div>

      {/* Canvas preview + dimensions */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5">
        <Label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Dimensions
        </Label>

        {/* Live preview */}
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background/50 py-6">
          <div className="flex flex-col items-center gap-2">
            <div
              className="rounded border border-border shadow-sm transition-all"
              style={{
                width: Math.min(120, 120 * (width / Math.max(width, height))),
                height: Math.min(120, 120 * (height / Math.max(width, height))),
                backgroundColor: bg,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: getContrastColor(bg) }}
                >
                  {width} × {height}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {((width * height) / 1000000).toFixed(2)} MP
            </span>
          </div>
        </div>

        {/* Width × Height inputs */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="canvas-width" className="text-xs">
              Width
            </Label>
            <Input
              id="canvas-width"
              type="number"
              min={64}
              max={2048}
              value={width}
              onChange={(e) => setWidth(clamp(e.target.value, 64, 2048))}
              className="h-10 tabular-nums"
            />
          </div>
          <div className="flex h-10 items-center px-1">
            <LinkIcon />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="canvas-height" className="text-xs">
              Height
            </Label>
            <Input
              id="canvas-height"
              type="number"
              min={64}
              max={2048}
              value={height}
              onChange={(e) => setHeight(clamp(e.target.value, 64, 2048))}
              className="h-10 tabular-nums"
            />
          </div>
          <span className="flex h-10 items-center text-xs text-muted-foreground">
            px
          </span>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Presets</Label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const isActive = width === p.w && height === p.h
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setWidth(p.w)
                    setHeight(p.h)
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-lg border px-3 py-2 transition-all",
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-muted"
                  )}
                >
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.ratio}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Appearance section */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Appearance</h3>
        <p className="text-xs text-muted-foreground">
          Background and rendering settings
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-5">
        {/* Background color */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Background Color</Label>
            <p className="text-xs text-muted-foreground">
              Canvas background when no frame is displayed
            </p>
          </div>
          <ColorField value={bg} onChange={setBg} />
        </div>

        <div className="h-px bg-border" />

        {/* Render quality */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Render Quality</Label>
            <p className="text-xs text-muted-foreground">
              Higher quality = slower performance
            </p>
          </div>
          <Select
            value={quality}
            onValueChange={(v) => setQuality(v as CanvasQuality)}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        opt.value === "low"
                          ? "bg-green-500"
                          : opt.value === "medium"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      )}
                    />
                    {opt.label}
                    <span className="text-muted-foreground">— {opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-border" />

        {/* Grid overlay */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Grid Overlay</Label>
            <p className="text-xs text-muted-foreground">
              Show alignment grid on canvas
            </p>
          </div>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} />
        </div>
      </div>
    </div>
  )
}

function clamp(value: string, min: number, max: number): number {
  const n = parseInt(value, 10)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)"
}
