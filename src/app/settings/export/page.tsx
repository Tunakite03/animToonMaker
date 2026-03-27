import { useSettingsStore, type ExportFormat } from "@/store/settings-store";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formats: { id: ExportFormat; name: string; desc: string; pros: string; icon: string }[] = [
  {
    id: "gif",
    name: "GIF",
    desc: "Universal compatibility",
    pros: "Works everywhere, easy sharing",
    icon: "🎞️",
  },
  {
    id: "webm",
    name: "WebM",
    desc: "Smaller file size",
    pros: "Better compression, modern format",
    icon: "🎬",
  },
];

export default function ExportSettingsPage() {
  const format = useSettingsStore((s) => s.exportFormat);
  const quality = useSettingsStore((s) => s.exportQuality);
  const scale = useSettingsStore((s) => s.exportScale);
  const canvasWidth = useSettingsStore((s) => s.canvasWidth);
  const canvasHeight = useSettingsStore((s) => s.canvasHeight);
  const setFormat = useSettingsStore((s) => s.setExportFormat);
  const setQuality = useSettingsStore((s) => s.setExportQuality);
  const setScale = useSettingsStore((s) => s.setExportScale);

  const outputWidth = canvasWidth * scale;
  const outputHeight = canvasHeight * scale;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Export</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how your animation is exported.
        </p>
      </div>

      {/* Format selection */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Format
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {formats.map((f) => {
            const isActive = format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 px-4 py-5 transition-all",
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border bg-background hover:border-primary/30 hover:bg-muted/30",
                )}
              >
                <span className="text-2xl">{f.icon}</span>
                <span className="mt-2 text-sm font-semibold">{f.name}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">{f.desc}</span>
                <span className="mt-2 rounded-full bg-muted px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  {f.pros}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality & Scale */}
      <div className="space-y-5 rounded-xl border border-border p-5">
        {/* Quality slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Quality</Label>
              <p className="text-xs text-muted-foreground">Higher = better image, larger file</p>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">
              {quality}%
            </span>
          </div>
          <Slider
            value={[quality]}
            onValueChange={([v]) => setQuality(v)}
            min={10}
            max={100}
            step={5}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Smaller file</span>
            <span>Best quality</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Export scale */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Export Scale</Label>
            <p className="text-xs text-muted-foreground">
              Output: {outputWidth} × {outputHeight} px
            </p>
          </div>
          <Select value={String(scale)} onValueChange={(v) => setScale(Number(v))}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1× (original)</SelectItem>
              <SelectItem value="2">2× (double)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Export summary */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <InfoIcon />
        <div className="text-xs text-muted-foreground">
          <p>
            Your animation will export as <strong className="text-foreground">{format.toUpperCase()}</strong> at{" "}
            <strong className="text-foreground">{outputWidth}×{outputHeight}</strong> with{" "}
            <strong className="text-foreground">{quality}%</strong> quality.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
