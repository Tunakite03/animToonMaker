import { useSettingsStore } from "@/store/settings-store"
import { getFrameGenerationCapabilities } from "@/services/generate-frame"
import { getMotionStrengthProfile, getProviderLabel } from "@/lib/ai-generation"
import { useImageDescriber } from "@/hooks/use-image-describer"
import { BlockIcon, PaletteIcon, TipIcon } from "@/components/icons"
import { Layers3, ScanEye, LoaderCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const PROMPT_LIMIT = 1000

export default function GenerationSettingsPage() {
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const styleSuffix = useSettingsStore((s) => s.styleSuffix)
  const negativePrompt = useSettingsStore((s) => s.negativePrompt)
  const motionStrength = useSettingsStore((s) => s.motionStrength)
  const sceneDescription = useSettingsStore((s) => s.sceneDescription)
  const setStyleSuffix = useSettingsStore((s) => s.setStyleSuffix)
  const setNegativePrompt = useSettingsStore((s) => s.setNegativePrompt)
  const setMotionStrength = useSettingsStore((s) => s.setMotionStrength)
  const setSceneDescription = useSettingsStore((s) => s.setSceneDescription)
  const providerLabel = getProviderLabel(aiProvider)
  const generationCapabilities = getFrameGenerationCapabilities(
    aiProvider,
    aiModel || undefined
  )
  const motionStrengthProfile = getMotionStrengthProfile(motionStrength)
  const continuityAvailable = generationCapabilities.supportsReferenceFrame

  const {
    describeCurrentFrame,
    isDescribing,
    error: describeError,
    hasVisionProvider,
  } = useImageDescriber()

  const handleAutoDescribe = async () => {
    const description = await describeCurrentFrame()
    if (description) {
      setSceneDescription(description.slice(0, PROMPT_LIMIT))
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Generation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how AI generates your animation frames.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={continuityAvailable ? "default" : "secondary"}
            className="h-6"
          >
            {continuityAvailable
              ? "Reference continuity available"
              : "Independent generation only"}
          </Badge>
          <Badge variant="outline" className="h-6">
            Provider: {providerLabel}
            {aiModel ? ` • ${aiModel}` : ""}
          </Badge>
          <Badge variant="outline" className="h-6">
            Negative prompt: Prompt guidance
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {continuityAvailable
            ? `${providerLabel} can reuse the previous completed frame as a visual reference. Motion Strength is active for adjacent-frame continuity.`
            : `${providerLabel} currently generates each frame independently. Motion Strength stays disabled until you switch to a provider with reference-frame support.`}
        </p>
      </div>

      {/* Scene & Character Lock */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers3 size={18} />
          </div>
          <div>
            <Label className="text-sm font-semibold">
              Scene &amp; Character Lock
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A detailed description of your character and scene, injected into
              every frame prompt. This is the most effective way to maintain
              visual consistency — especially for providers without
              image-to-image support.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="scene-description"
              className="text-xs text-muted-foreground"
            >
              Character &amp; Scene Description
            </Label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {sceneDescription.length} / {PROMPT_LIMIT}
            </span>
          </div>
          <Textarea
            id="scene-description"
            value={sceneDescription}
            onChange={(e) =>
              setSceneDescription(e.target.value.slice(0, PROMPT_LIMIT))
            }
            placeholder="e.g. A cartoon soldier character with green uniform, brown helmet, black boots, holding a rifle. Small chibi-style body proportions. Pink gradient background with grey rocks."
            className="min-h-24 font-mono text-xs"
            disabled={isDescribing}
          />

          {/* Auto-describe button */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAutoDescribe}
              disabled={isDescribing}
            >
              {isDescribing ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" />
                  Analyzing frame…
                </>
              ) : (
                <>
                  <ScanEye size={13} />
                  Auto-describe from current frame
                </>
              )}
            </Button>
            {!hasVisionProvider() && (
              <span className="text-[10px] text-muted-foreground">
                Requires a Gemini or OpenAI API key
              </span>
            )}
          </div>

          {/* Describe error */}
          {describeError && (
            <div className="rounded-md border border-destructive/25 bg-destructive/6 px-2.5 py-2 text-[11px] text-destructive/85">
              {describeError}
            </div>
          )}

          <div className="flex items-start gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-[11px] text-emerald-700 dark:text-emerald-300">
            <TipIcon />
            <span>
              <strong>Highly recommended</strong> for {providerLabel}.{" "}
              {continuityAvailable
                ? "This description supplements the visual reference frame for even stronger consistency."
                : "Without image-to-image support, this is your primary tool for keeping frames visually consistent. Be as specific as possible about character appearance, pose style, colors, and background."}{" "}
              Use <strong>Auto-describe</strong> to let AI scan your current
              frame and write the description for you.
            </span>
          </div>
        </div>
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
            className="min-h-20 font-mono text-xs"
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
            className="min-h-20 font-mono text-xs"
          />
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <TipIcon />
            <span>
              Negative Prompt is currently appended as prompt guidance. Some
              providers may not treat it like a native negative-prompt
              parameter.
            </span>
          </div>
        </div>
      </div>

      {/* Continuity */}
      <div className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-sm font-semibold">Continuity</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tune how strongly each new frame can diverge from the previous one
              when continuity mode is available.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "space-y-3 rounded-lg border border-border bg-background/50 px-4 py-3",
            !continuityAvailable && "opacity-70"
          )}
        >
          <div>
            <Label className="text-sm">
              Motion Strength: {Math.round(motionStrength * 100)}%
              <span className="ml-2 text-xs font-medium text-muted-foreground">
                {motionStrengthProfile.label}
              </span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {motionStrengthProfile.description}
            </p>
          </div>
          <Slider
            value={[motionStrength]}
            onValueChange={([value]) => setMotionStrength(value)}
            min={0.05}
            max={0.95}
            step={0.05}
            disabled={!continuityAvailable}
          />
          <div className="flex items-start gap-1.5 rounded-md bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <TipIcon />
            <span>
              {continuityAvailable
                ? "Continuity mode currently uses the previous completed frame as a visual reference when the selected provider supports it."
                : `Switch to Gemini image generation to turn Motion Strength back on and reuse the previous frame as a visual reference.`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
