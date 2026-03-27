import { useSettingsStore } from "@/store/settings-store";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function EditorSettingsPage() {
  const showOnionSkin = useSettingsStore((s) => s.showOnionSkin);
  const onionSkinOpacity = useSettingsStore((s) => s.onionSkinOpacity);
  const thumbnailSize = useSettingsStore((s) => s.timelineThumbnailSize);
  const setShowOnionSkin = useSettingsStore((s) => s.setShowOnionSkin);
  const setOnionSkinOpacity = useSettingsStore((s) => s.setOnionSkinOpacity);
  const setThumbnailSize = useSettingsStore((s) => s.setTimelineThumbnailSize);

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
                Show a semi-transparent overlay of the previous frame for animation continuity.
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
                <p className="font-medium text-foreground">{onionSkinOpacity}% opacity</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
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
              <Label className="text-xs text-muted-foreground">Thumbnail Size</Label>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
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
    </div>
  );
}

function OnionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="4" height="6" x="2" y="4" rx="1" />
      <rect width="4" height="6" x="10" y="4" rx="1" />
      <rect width="4" height="6" x="18" y="4" rx="1" />
      <path d="M2 14h20" />
      <path d="M6 14v4" />
      <path d="M14 14v4" />
    </svg>
  );
}
