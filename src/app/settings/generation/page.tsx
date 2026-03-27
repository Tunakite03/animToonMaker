"use client";

import { useSettingsStore } from "@/store/settings-store";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const PROMPT_LIMIT = 1000;

export default function GenerationSettingsPage() {
  const styleSuffix = useSettingsStore((s) => s.styleSuffix);
  const negativePrompt = useSettingsStore((s) => s.negativePrompt);
  const autoGenerate = useSettingsStore((s) => s.autoGenerate);
  const setStyleSuffix = useSettingsStore((s) => s.setStyleSuffix);
  const setNegativePrompt = useSettingsStore((s) => s.setNegativePrompt);
  const setAutoGenerate = useSettingsStore((s) => s.setAutoGenerate);

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
              Tokens appended to every frame prompt for a cohesive look across all frames.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="style-suffix" className="text-xs text-muted-foreground">
              Style Suffix
            </Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {styleSuffix.length} / {PROMPT_LIMIT}
            </span>
          </div>
          <Textarea
            id="style-suffix"
            value={styleSuffix}
            onChange={(e) => setStyleSuffix(e.target.value.slice(0, PROMPT_LIMIT))}
            placeholder=", cartoon style, flat color, consistent lighting"
            className="min-h-[80px] font-mono text-xs"
          />
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <TipIcon />
            <span>
              Include style, color palette, and lighting descriptors for visual consistency across frames.
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
            <Label className="text-xs text-muted-foreground">Exclude from generation</Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {negativePrompt.length} / {PROMPT_LIMIT}
            </span>
          </div>
          <Textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value.slice(0, PROMPT_LIMIT))}
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
              Automatically start generating when a new frame is added with a prompt.
            </p>
          </div>
          <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
        </div>
      </div>
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}

function TipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
