import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  useSettingsStore,
  type CanvasQuality,
  type ExportFormat,
} from "@/store/settings-store"
import { SettingsIcon } from "@/components/icons"

export function SettingsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <SettingsIcon />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure canvas, AI generation, export, and editor preferences.
          </DialogDescription>
        </DialogHeader>
        <SettingsTabs />
      </DialogContent>
    </Dialog>
  )
}

function SettingsTabs() {
  return (
    <Tabs defaultValue="canvas" className="mt-2">
      <TabsList className="w-full">
        <TabsTrigger value="canvas" className="flex-1">
          Canvas
        </TabsTrigger>
        <TabsTrigger value="ai" className="flex-1">
          AI
        </TabsTrigger>
        <TabsTrigger value="export" className="flex-1">
          Export
        </TabsTrigger>
        <TabsTrigger value="editor" className="flex-1">
          Editor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="canvas" className="space-y-4 pt-2">
        <CanvasSettings />
      </TabsContent>
      <TabsContent value="ai" className="space-y-4 pt-2">
        <AISettings />
      </TabsContent>
      <TabsContent value="export" className="space-y-4 pt-2">
        <ExportSettings />
      </TabsContent>
      <TabsContent value="editor" className="space-y-4 pt-2">
        <EditorSettings />
      </TabsContent>
    </Tabs>
  )
}

/* ─── Canvas Tab ─── */
function CanvasSettings() {
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
    <>
      <SettingRow label="Canvas Size">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={64}
            max={2048}
            value={width}
            onChange={(e) => setWidth(clampInt(e.target.value, 64, 2048))}
            className="h-8 w-24"
          />
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            type="number"
            min={64}
            max={2048}
            value={height}
            onChange={(e) => setHeight(clampInt(e.target.value, 64, 2048))}
            className="h-8 w-24"
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      </SettingRow>

      <div className="flex gap-2">
        <PresetButton
          label="512 × 512"
          onClick={() => {
            setWidth(512)
            setHeight(512)
          }}
        />
        <PresetButton
          label="768 × 768"
          onClick={() => {
            setWidth(768)
            setHeight(768)
          }}
        />
        <PresetButton
          label="1024 × 576"
          onClick={() => {
            setWidth(1024)
            setHeight(576)
          }}
        />
      </div>

      <Separator />

      <SettingRow label="Background Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-border"
          />
          <Input
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-8 w-28 font-mono text-xs"
          />
        </div>
      </SettingRow>

      <SettingRow label="Render Quality">
        <Select
          value={quality}
          onValueChange={(v) => setQuality(v as CanvasQuality)}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low (fast)</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High (slow)</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Show Grid Overlay">
        <Switch checked={showGrid} onCheckedChange={setShowGrid} />
      </SettingRow>
    </>
  )
}

/* ─── AI Tab ─── */
function AISettings() {
  const styleSuffix = useSettingsStore((s) => s.styleSuffix)
  const negativePrompt = useSettingsStore((s) => s.negativePrompt)
  const autoGenerate = useSettingsStore((s) => s.autoGenerate)
  const setStyleSuffix = useSettingsStore((s) => s.setStyleSuffix)
  const setNegativePrompt = useSettingsStore((s) => s.setNegativePrompt)
  const setAutoGenerate = useSettingsStore((s) => s.setAutoGenerate)

  return (
    <>
      <SettingRow
        label="Style Suffix"
        description="Appended to every frame prompt for consistent style"
      >
        <Textarea
          value={styleSuffix}
          onChange={(e) => setStyleSuffix(e.target.value)}
          className="min-h-15 text-xs"
          placeholder=", cartoon style, flat color..."
        />
      </SettingRow>

      <SettingRow
        label="Negative Prompt"
        description="Tell the AI what to avoid"
      >
        <Textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          className="min-h-15 text-xs"
          placeholder="blurry, low quality, text, watermark..."
        />
      </SettingRow>

      <Separator />

      <SettingRow
        label="Auto-generate on Add"
        description="Automatically generate image when a new frame is added"
      >
        <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
      </SettingRow>
    </>
  )
}

/* ─── Export Tab ─── */
function ExportSettings() {
  const format = useSettingsStore((s) => s.exportFormat)
  const quality = useSettingsStore((s) => s.exportQuality)
  const scale = useSettingsStore((s) => s.exportScale)
  const setFormat = useSettingsStore((s) => s.setExportFormat)
  const setQuality = useSettingsStore((s) => s.setExportQuality)
  const setScale = useSettingsStore((s) => s.setExportScale)

  return (
    <>
      <SettingRow label="Export Format">
        <Select
          value={format}
          onValueChange={(v) => setFormat(v as ExportFormat)}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gif">GIF</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="frames">PNG Frames</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label={`Quality: ${quality}%`}>
        <Slider
          value={[quality]}
          onValueChange={([v]) => setQuality(v)}
          min={10}
          max={100}
          step={5}
          className="w-44"
        />
      </SettingRow>

      <SettingRow label="Export Scale">
        <Select
          value={String(scale)}
          onValueChange={(v) => setScale(Number(v))}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1× (original)</SelectItem>
            <SelectItem value="2">2× (double)</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </>
  )
}

/* ─── Editor Tab ─── */
function EditorSettings() {
  const showOnionSkin = useSettingsStore((s) => s.showOnionSkin)
  const onionSkinOpacity = useSettingsStore((s) => s.onionSkinOpacity)
  const thumbnailSize = useSettingsStore((s) => s.timelineThumbnailSize)
  const setShowOnionSkin = useSettingsStore((s) => s.setShowOnionSkin)
  const setOnionSkinOpacity = useSettingsStore((s) => s.setOnionSkinOpacity)
  const setThumbnailSize = useSettingsStore((s) => s.setTimelineThumbnailSize)
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults)

  return (
    <>
      <SettingRow
        label="Onion Skin"
        description="Show ghost of previous frame on canvas"
      >
        <Switch checked={showOnionSkin} onCheckedChange={setShowOnionSkin} />
      </SettingRow>

      {showOnionSkin && (
        <SettingRow label={`Onion Skin Opacity: ${onionSkinOpacity}%`}>
          <Slider
            value={[onionSkinOpacity]}
            onValueChange={([v]) => setOnionSkinOpacity(v)}
            min={5}
            max={80}
            step={5}
            className="w-44"
          />
        </SettingRow>
      )}

      <Separator />

      <SettingRow label={`Timeline Thumbnail: ${thumbnailSize}px`}>
        <Slider
          value={[thumbnailSize]}
          onValueChange={([v]) => setThumbnailSize(v)}
          min={48}
          max={128}
          step={8}
          className="w-44"
        />
      </SettingRow>

      <Separator />

      <Button variant="destructive" size="sm" onClick={resetToDefaults}>
        Reset All to Defaults
      </Button>
    </>
  )
}

/* ─── Shared UI pieces ─── */

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 shrink-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function PresetButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button variant="outline" size="xs" onClick={onClick}>
      {label}
    </Button>
  )
}

function clampInt(value: string, min: number, max: number): number {
  const n = parseInt(value, 10)
  if (isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}
