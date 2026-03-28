import { useState } from "react"
import {
  DEFAULT_SHORTCUT_BINDINGS,
  formatShortcutLabel,
  shortcutFromKeyboardEvent,
  type ShortcutAction,
} from "@/lib/shortcuts"
import { useSettingsStore } from "@/store/settings-store"
import { OnionIcon, TimelineIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

const SHORTCUT_FIELDS: Array<{
  action: ShortcutAction
  label: string
  description: string
}> = [
  {
    action: "saveProject",
    label: "Save project",
    description: "Quick-save the current project from anywhere in the editor.",
  },
  {
    action: "undo",
    label: "Undo",
    description: "Revert the latest change in the canvas or timeline.",
  },
  {
    action: "redo",
    label: "Redo",
    description: "Restore the most recently undone change.",
  },
]

export default function EditorSettingsPage() {
  const showOnionSkin = useSettingsStore((s) => s.showOnionSkin)
  const onionSkinOpacity = useSettingsStore((s) => s.onionSkinOpacity)
  const thumbnailSize = useSettingsStore((s) => s.timelineThumbnailSize)
  const shortcutBindings = useSettingsStore((s) => s.shortcutBindings)
  const setShowOnionSkin = useSettingsStore((s) => s.setShowOnionSkin)
  const setOnionSkinOpacity = useSettingsStore((s) => s.setOnionSkinOpacity)
  const setThumbnailSize = useSettingsStore((s) => s.setTimelineThumbnailSize)
  const setShortcutBinding = useSettingsStore((s) => s.setShortcutBinding)
  const resetShortcutBindings = useSettingsStore((s) => s.resetShortcutBindings)
  const [capturingAction, setCapturingAction] = useState<ShortcutAction | null>(
    null
  )

  const handleShortcutKeyDown = (
    action: ShortcutAction,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Tab") {
      return
    }

    if (event.key === "Escape") {
      setCapturingAction(null)
      event.currentTarget.blur()
      return
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault()
      setShortcutBinding(action, "")
      setCapturingAction(null)
      event.currentTarget.blur()
      return
    }

    const shortcut = shortcutFromKeyboardEvent(event.nativeEvent)
    if (!shortcut) {
      return
    }

    event.preventDefault()
    setShortcutBinding(action, shortcut)
    setCapturingAction(null)
    event.currentTarget.blur()
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editor</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize the editor experience.
        </p>
      </div>

      {/* Onion Skin */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <OnionIcon />
            </div>
            <div>
              <Label className="text-sm font-semibold">Onion Skin</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Show a semi-transparent overlay of the previous frame for
                animation continuity.
              </p>
            </div>
          </div>
          <Switch checked={showOnionSkin} onCheckedChange={setShowOnionSkin} />
        </div>

        {showOnionSkin && (
          <div className="ml-12 space-y-3 border-t border-border pt-4">
            {/* Visual preview */}
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background/50 py-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-md bg-muted" />
                <div
                  className="absolute inset-0 rounded-md border border-orange-400/30 bg-orange-400 transition-opacity"
                  style={{ opacity: onionSkinOpacity / 100 }}
                />
              </div>
              <div className="ml-3 text-[11px] text-muted-foreground">
                <p>Previous frame overlay</p>
                <p className="font-medium text-foreground">
                  {onionSkinOpacity}% opacity
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                  {onionSkinOpacity}%
                </span>
              </div>
              <Slider
                value={[onionSkinOpacity]}
                onValueChange={([v]) => setOnionSkinOpacity(v)}
                min={5}
                max={80}
                step={5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Subtle (5%)</span>
                <span>Visible (80%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <TimelineIcon />
          </div>
          <div>
            <Label className="text-sm font-semibold">Timeline</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customize the animation timeline appearance.
            </p>
          </div>
        </div>

        <div className="ml-12 space-y-3 border-t border-border pt-4">
          {/* Thumbnail preview */}
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-background/50 py-4">
            <div className="flex items-end gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded border border-border bg-muted transition-all"
                  style={{
                    width: thumbnailSize * 0.6,
                    height: thumbnailSize * 0.6,
                  }}
                />
              ))}
            </div>
            <div className="ml-3 text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground">{thumbnailSize}px</p>
              <p>thumbnail size</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Thumbnail Size
              </Label>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                {thumbnailSize}px
              </span>
            </div>
            <Slider
              value={[thumbnailSize]}
              onValueChange={([v]) => setThumbnailSize(v)}
              min={48}
              max={128}
              step={8}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Compact (48px)</span>
              <span>Large (128px)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Label className="text-sm font-semibold">Keyboard shortcuts</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Click a field, then press the new key combination. Use Backspace
              or Delete to clear a shortcut. Ctrl also maps to Command on macOS.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetShortcutBindings}>
            Reset all
          </Button>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          {SHORTCUT_FIELDS.map((field) => (
            <div
              key={field.action}
              className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {field.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>

              <Input
                readOnly
                value={
                  capturingAction === field.action
                    ? "Press shortcut..."
                    : formatShortcutLabel(shortcutBindings[field.action])
                }
                onFocus={() => setCapturingAction(field.action)}
                onBlur={() =>
                  setCapturingAction((current) =>
                    current === field.action ? null : current
                  )
                }
                onKeyDown={(event) =>
                  handleShortcutKeyDown(field.action, event)
                }
                className="h-9 font-mono text-sm"
                aria-label={`${field.label} shortcut`}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setShortcutBinding(
                    field.action,
                    DEFAULT_SHORTCUT_BINDINGS[field.action]
                  )
                }
              >
                Reset
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
