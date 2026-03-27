import { useSettingsStore } from "@/store/settings-store"
import { AutoIcon, BlockIcon, PaletteIcon, TipIcon } from "@/components/icons"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const PROMPT_LIMIT = 1000

export default function GenerationSettingsPage() {
  const styleSuffix = useSettingsStore((s) => s.styleSuffix)
  const negativePrompt = useSettingsStore((s) => s.negativePrompt)
  const autoGenerate = useSettingsStore((s) => s.autoGenerate)
  const setStyleSuffix = useSettingsStore((s) => s.setStyleSuffix)
  const setNegativePrompt = useSettingsStore((s) => s.setNegativePrompt)
  const setAutoGenerate = useSettingsStore((s) => s.setAutoGenerate)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how AI generates your animation frames.
        </p>
      </div>

      {/* Style Consistency */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <PaletteIcon />
          </div>
          <div>
            <Label className="text-sm font-semibold">Style Consistency</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tokens appended to every frame prompt for a cohesive look across
              all frames.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="style-suffix"
              className="text-xs text-muted-foreground"
            >
              Style Suffix
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {styleSuffix.length} / {PROMPT_LIMIT}
            </span>
          </div>
          <Textarea
            id="style-suffix"
            value={styleSuffix}
            onChange={(e) =>
              setStyleSuffix(e.target.value.slice(0, PROMPT_LIMIT))
            }
            placeholder=", cartoon style, flat color, consistent lighting"
            className="min-h-[80px] font-mono text-xs"
          />
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <TipIcon />
            <span>
              Include style, color palette, and lighting descriptors for visual
              consistency across frames.
            </span>
          </div>
        </div>
      </div>

      {/* Negative Prompt */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <BlockIcon />
          </div>
          <div>
            <Label className="text-sm font-semibold">Negative Prompt</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tell the AI what to avoid in generated images.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Exclude from generation
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {negativePrompt.length} / {PROMPT_LIMIT}
            </span>
          </div>
          <Textarea
            value={negativePrompt}
            onChange={(e) =>
              setNegativePrompt(e.target.value.slice(0, PROMPT_LIMIT))
            }
            placeholder="blurry, low quality, text, watermark, deformed..."
            className="min-h-[80px] font-mono text-xs"
          />
        </div>
      </div>

      {/* Behavior */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <AutoIcon />
          </div>
          <div className="flex-1">
            <Label className="text-sm font-semibold">Behavior</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Automation settings for frame generation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
          <div>
            <Label className="text-sm">Auto-generate on Add</Label>
            <p className="text-xs text-muted-foreground">
              Automatically start generating when a new frame is added with a
              prompt.
            </p>
          </div>
          <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
        </div>
      </div>
    </div>
  )
}
