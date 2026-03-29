import { startTransition, useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  selectActiveFrame,
  selectActiveFrames,
  useAnimationStore,
} from "@/store/animation-store"
import { useFrameGenerator } from "@/hooks/use-frame-generator"
import { useImageDescriber } from "@/hooks/use-image-describer"
import { useSettingsStore, type AIProvider } from "@/store/settings-store"
import {
  AlertIcon,
  CopyIcon,
  EmptyFrameIcon,
  ErrorCircleIcon,
  FrameSelectIcon,
  PlayAllIcon,
  SparklesIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons"
import { ScanEye, LoaderCircle } from "lucide-react"
import { getFrameGenerationCapabilities } from "@/services/generate-frame"
import { AUTO_DESCRIBE_BASE_PROMPT } from "@/services/describe-image"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getProviderLabel } from "@/lib/ai-generation"
import { buildFrameMotionGuidance } from "@/lib/keypoint-guidance"
import { cn } from "@/lib/utils"

const PROMPT_MAX = 1000
const BATCH_MAX = 24
const BATCH_MIN = 2

const MODEL_OPTIONS: Partial<
  Record<AIProvider, Array<{ value: string; label: string }>>
> = {
  gemini: [
    { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
    {
      value: "gemini-3.1-flash-image-preview",
      label: "Gemini 3.1 Flash Image (Preview)",
    },
    {
      value: "gemini-3-pro-image-preview",
      label: "Gemini 3 Pro Image (Preview)",
    },
  ],
  fal: [
    { value: "fal-ai/fast-sdxl", label: "Fast SDXL" },
    { value: "fal-ai/flux/dev", label: "FLUX Dev" },
    { value: "fal-ai/flux/schnell", label: "FLUX Schnell" },
  ],
  together: [
    { value: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell" },
    { value: "black-forest-labs/FLUX.1.1-pro", label: "FLUX.1.1 Pro" },
    { value: "black-forest-labs/FLUX.2-pro", label: "FLUX.2 Pro" },
  ],
  replicate: [
    { value: "stability-ai/sdxl", label: "SDXL" },
    { value: "stability-ai/stable-diffusion", label: "Stable Diffusion" },
  ],
  openai: [
    { value: "dall-e-3", label: "DALL·E 3" },
    { value: "dall-e-2", label: "DALL·E 2" },
  ],
  stability: [
    { value: "sd3.5-large", label: "SD 3.5 Large" },
    { value: "sd3.5-large-turbo", label: "SD 3.5 Large Turbo" },
    { value: "sd3.5-medium", label: "SD 3.5 Medium" },
    { value: "stable-image-core", label: "Stable Image Core" },
    { value: "stable-image-ultra", label: "Stable Image Ultra" },
  ],
}

function buildQuickAnimationPrompt(
  basePrompt: string,
  index: number,
  total: number
) {
  const trimmed = basePrompt.trim()
  if (index === 0) {
    return trimmed
  }

  const progress = index / (total - 1) // 0→1 across the sequence
  const motionPhase =
    progress < 0.25
      ? "beginning of the motion"
      : progress < 0.5
        ? "early-middle of the motion"
        : progress < 0.75
          ? "late-middle of the motion"
          : "completing the motion"

  return [
    trimmed,
    `This is frame ${index + 1} of ${total} (${motionPhase}).`,
    "IMPORTANT: Keep the EXACT same character design, face, outfit, color palette, art style, line weight, and background as frame 1.",
    "Only advance the pose/action by one small animation step from the previous frame.",
    "Do NOT redesign or reinterpret the character — maintain pixel-level visual identity.",
  ].join(" ")
}

export function FramePromptPanel() {
  const selectedFrame = useAnimationStore(selectActiveFrame)
  const frames = useAnimationStore(selectActiveFrames)
  const {
    selectedFrameId,
    updateFrame,
    addFrame,
    removeFrame,
    duplicateFrame,
  } = useAnimationStore(
    useShallow((s) => ({
      selectedFrameId: s.project.selectedFrameId,
      updateFrame: s.updateFrame,
      addFrame: s.addFrame,
      removeFrame: s.removeFrame,
      duplicateFrame: s.duplicateFrame,
    }))
  )
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const setAIModel = useSettingsStore((s) => s.setAIModel)

  const { generateFrame, generateBatch, cancelGeneration, isGenerating } =
    useFrameGenerator()

  const {
    describeCurrentFrame,
    isDescribing,
    error: describeError,
    hasVisionProvider,
  } = useImageDescriber()
  const setSceneDescription = useSettingsStore((s) => s.setSceneDescription)

  const handleAutoDescribe = async () => {
    const description = await describeCurrentFrame()
    if (description) {
      setSceneDescription(description.slice(0, PROMPT_MAX))
    }
  }

  const [batchPrompt, setBatchPrompt] = useState("")
  const [batchCount, setBatchCount] = useState(6)
  const [promptDraft, setPromptDraft] = useState("")
  const [promptFrameId, setPromptFrameId] = useState<string | null>(null)
  const [isPromptFocused, setIsPromptFocused] = useState(false)

  useEffect(() => {
    if (!selectedFrame) {
      setPromptDraft("")
      setPromptFrameId(null)
      setIsPromptFocused(false)
      return
    }

    if (selectedFrame.id !== promptFrameId) {
      setPromptDraft(selectedFrame.prompt)
      setPromptFrameId(selectedFrame.id)
      return
    }

    if (!isPromptFocused && promptDraft !== selectedFrame.prompt) {
      setPromptDraft(selectedFrame.prompt)
    }
  }, [isPromptFocused, promptDraft, promptFrameId, selectedFrame])

  const commitPromptDraft = useCallback(
    (nextValue?: string) => {
      if (!selectedFrame) return

      const value = (nextValue ?? promptDraft).slice(0, PROMPT_MAX)
      if (value === selectedFrame.prompt) return

      startTransition(() => {
        updateFrame(selectedFrame.id, { prompt: value })
      })
    },
    [promptDraft, selectedFrame, updateFrame]
  )

  const selectedIndex = selectedFrame
    ? frames.findIndex((f) => f.id === selectedFrameId) + 1
    : 0

  const promptLength = promptDraft.length
  const promptNearLimit = promptLength > PROMPT_MAX * 0.85
  const pendingCount = frames.filter(
    (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error")
  ).length
  const modelOptions = MODEL_OPTIONS[aiProvider] ?? []
  const showModelSelector =
    aiProvider !== "placeholder" && modelOptions.length > 0
  const currentModelValue = aiModel || modelOptions[0]?.value || ""
  const providerLabel = getProviderLabel(aiProvider)
  const generationCapabilities = getFrameGenerationCapabilities(
    aiProvider,
    currentModelValue || undefined
  )
  const staleStatusLabel = generationCapabilities.supportsReferenceFrame
    ? "Needs Refresh"
    : "Continuity Stale"
  const previousFrame =
    selectedFrame && selectedIndex > 1
      ? (frames[selectedIndex - 2] ?? null)
      : null
  const previousFrameHasImage = Boolean(
    previousFrame &&
    (previousFrame.imageAssetId || previousFrame.imageUrl) &&
    !previousFrame.isBlank
  )
  const previousFrameIsStale = Boolean(previousFrame?.continuityStale)
  const motionGuidance = buildFrameMotionGuidance(selectedFrame, previousFrame)

  useEffect(() => {
    if (!showModelSelector || !modelOptions.length) {
      return
    }

    const hasCurrent = modelOptions.some((option) => option.value === aiModel)
    if (!hasCurrent) {
      setAIModel(modelOptions[0].value)
    }
  }, [aiModel, modelOptions, setAIModel, showModelSelector])

  const handleGenerate = () => {
    if (!selectedFrame) return
    const nextPrompt = promptDraft.slice(0, PROMPT_MAX)
    if (!nextPrompt.trim()) return
    commitPromptDraft(nextPrompt)
    generateFrame(selectedFrame.id, nextPrompt)
  }

  const handleGenerateAll = () => {
    const pending = frames.filter(
      (f) => f.prompt.trim() && (f.status === "idle" || f.status === "error")
    )
    generateBatch(pending)
  }

  const handleBatchCreate = () => {
    if (!batchPrompt.trim()) return
    const ids: { id: string; prompt: string }[] = []
    for (let i = 0; i < batchCount; i++) {
      const prompt = buildQuickAnimationPrompt(batchPrompt, i, batchCount)
      const id = addFrame(prompt)
      ids.push({ id, prompt })
    }
    generateBatch(ids)
  }

  const handleDeleteFrame = () => {
    if (!selectedFrame) return
    removeFrame(selectedFrame.id)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 bg-card/90 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold tracking-wide text-foreground/80">
            Frame Editor
          </span>
          {selectedFrame && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              #{selectedIndex}
            </span>
          )}
        </div>
        {selectedFrame && (
          <StatusPill
            status={
              selectedFrame.continuityStale ? "stale" : selectedFrame.status
            }
            staleLabel={staleStatusLabel}
          />
        )}
      </div>

      {/* ── Frame preview strip (when a frame is selected) ────────────── */}
      {selectedFrame && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-3">
          {/* Thumbnail */}
          <div
            className={cn(
              "relative h-13 w-13 shrink-0 overflow-hidden rounded-lg border bg-muted/60",
              selectedFrame.continuityStale
                ? "border-amber-400/70"
                : selectedFrame.status === "done" ||
                    ((selectedFrame.imageAssetId || selectedFrame.imageUrl) &&
                      !selectedFrame.isBlank)
                  ? "border-border/60"
                  : "border-border/40"
            )}
          >
            {selectedFrame.status === "generating" ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : selectedFrame.status === "error" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <ErrorCircleIcon />
              </div>
            ) : selectedFrame.imageUrl && !selectedFrame.isBlank ? (
              <img
                src={selectedFrame.imageUrl}
                alt={`Frame ${selectedIndex}`}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : selectedFrame.imageAssetId && !selectedFrame.isBlank ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="bg-checker flex h-full w-full items-center justify-center text-muted-foreground/25">
                <EmptyFrameIcon />
              </div>
            )}

            {/* Status badge on thumbnail */}
            {selectedFrame.continuityStale ? (
              <div className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_4px] shadow-amber-400/60" />
            ) : selectedFrame.status === "done" ? (
              <div className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_4px] shadow-emerald-400/60" />
            ) : null}
          </div>

          {/* Frame meta info */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm leading-none font-semibold text-foreground/90">
                Frame {selectedIndex}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                of {frames.length}
              </span>
            </div>

            {promptDraft ? (
              <p className="truncate font-mono text-[10px] leading-none text-muted-foreground/60">
                {promptDraft.slice(0, 48)}
                {promptDraft.length > 48 ? "…" : ""}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/40 italic">
                No prompt yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col divide-y divide-border/40">
          {/* ── Section: Prompt + Generate ────────────────────────── */}
          <div className="px-4 py-4">
            {selectedFrame ? (
              <div className="flex flex-col gap-3">
                {showModelSelector ? (
                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
                    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {providerLabel} Model
                    </span>
                    <Select
                      value={currentModelValue}
                      onValueChange={setAIModel}
                    >
                      <SelectTrigger className="h-7 flex-1 border-border/60 bg-transparent text-xs shadow-none focus-visible:ring-0">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((model) => (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            className="text-xs"
                          >
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={
                      generationCapabilities.supportsReferenceFrame
                        ? "default"
                        : "secondary"
                    }
                    className="h-5 text-[10px]"
                  >
                    {generationCapabilities.supportsReferenceFrame
                      ? "Continuity on"
                      : "Independent only"}
                  </Badge>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    Negative prompt: Prompt guidance
                  </Badge>
                  {motionGuidance ? (
                    <Badge variant="outline" className="h-5 text-[10px]">
                      Motion pins: {motionGuidance.pinCount}
                    </Badge>
                  ) : null}
                  {selectedFrame.continuitySourceFrameId &&
                  !selectedFrame.continuityStale ? (
                    <Badge variant="outline" className="h-5 text-[10px]">
                      Reference-linked
                    </Badge>
                  ) : null}
                </div>

                {/* Prompt label row */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="frame-prompt"
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
                  >
                    Prompt
                  </label>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums transition-colors",
                      promptNearLimit
                        ? promptLength >= PROMPT_MAX
                          ? "font-semibold text-destructive"
                          : "text-amber-500"
                        : "text-muted-foreground/40"
                    )}
                  >
                    {promptLength}/{PROMPT_MAX}
                  </span>
                </div>

                {/* Textarea */}
                <Textarea
                  id="frame-prompt"
                  value={promptDraft}
                  onChange={(e) => {
                    if (e.target.value.length <= PROMPT_MAX) {
                      setPromptDraft(e.target.value)
                    }
                  }}
                  onFocus={() => setIsPromptFocused(true)}
                  onBlur={() => {
                    setIsPromptFocused(false)
                    commitPromptDraft()
                  }}
                  placeholder="Describe this frame in detail…"
                  className="min-h-16 resize-none border-border/60 bg-background/60 text-sm leading-relaxed placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />

                {/* Error message */}
                {selectedFrame.errorMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/6 px-3 py-2">
                    <AlertIcon className="mt-0.5 shrink-0 text-destructive/70" />
                    <p className="text-[11px] leading-relaxed text-destructive/85">
                      {selectedFrame.errorMessage}
                    </p>
                  </div>
                )}

                {selectedFrame.continuityStale ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/8 px-3 py-2">
                    <AlertIcon className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                      {generationCapabilities.supportsReferenceFrame
                        ? "An earlier frame changed. Regenerate this frame or run Generate All Pending to refresh the continuity chain."
                        : `An earlier frame changed. ${providerLabel} generates independently — use Scene & Character Lock (Generation settings) for consistency, or switch to a provider with image-to-image support (Gemini, fal, Stability).`}
                    </p>
                  </div>
                ) : selectedIndex > 1 ? (
                  <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    {generationCapabilities.supportsReferenceFrame
                      ? previousFrameHasImage && !previousFrameIsStale
                        ? `Continuity mode is active. This frame will use frame ${selectedIndex - 1} as a visual reference.`
                        : previousFrameIsStale
                          ? "The previous frame still needs a continuity refresh, so this frame would generate independently until the chain is repaired."
                          : "No completed previous frame is available yet, so this frame will generate independently."
                      : `${providerLabel} generates frames independently — fill in Scene & Character Lock in Generation settings with a detailed character description to reduce frame-to-frame drift.`}
                  </div>
                ) : generationCapabilities.supportsReferenceFrame ? (
                  <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    Frame 1 starts the sequence independently. From frame 2
                    onward, the app reuses the previous frame as a visual
                    reference when possible.
                  </div>
                ) : null}

                {motionGuidance ? (
                  <div className="rounded-md border border-sky-500/20 bg-sky-500/6 px-3 py-2 text-[11px] leading-relaxed text-sky-900 dark:text-sky-100">
                    {motionGuidance.matchedCount > 0
                      ? `Motion pins are active. ${motionGuidance.matchedCount} labeled point${motionGuidance.matchedCount === 1 ? "" : "s"} match the previous frame and will be turned into pose guidance during generation.`
                      : `Motion pins are active. ${motionGuidance.pinCount} anchor point${motionGuidance.pinCount === 1 ? "" : "s"} will guide composition for this frame.`}
                  </div>
                ) : null}

                {/* Generate button */}
                <div className="relative">
                  <Button
                    onClick={handleGenerate}
                    disabled={
                      selectedFrame.status === "generating" ||
                      !promptDraft.trim()
                    }
                    className="relative h-9 w-full gap-2 font-medium"
                  >
                    {selectedFrame.status === "generating" ? (
                      <>
                        <SpinnerIcon />
                        <span>Generating…</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon size={14} />
                        <span>
                          {selectedFrame.status === "done"
                            ? "Regenerate"
                            : "Generate Frame"}
                        </span>
                      </>
                    )}
                  </Button>

                  {/* Inline cancel — only during generation */}
                  {selectedFrame.status === "generating" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => cancelGeneration(selectedFrame.id)}
                          className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded bg-white/20 text-white transition-colors hover:bg-white/35"
                        >
                          <XIcon size={9} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Cancel generation
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Secondary actions */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateFrame(selectedFrame.id)}
                        className="h-7 flex-1 gap-1.5 border-border/60 text-xs hover:border-primary/40 hover:bg-primary/5"
                      >
                        <CopyIcon />
                        Duplicate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Duplicate this frame
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteFrame}
                        className="h-7 w-7 shrink-0 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <TrashIcon />
                        <span className="sr-only">Delete frame</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete frame</TooltipContent>
                  </Tooltip>
                </div>

                {/* Auto-describe: scan frame image → fill Scene & Character Lock */}
                {selectedFrame.status === "done" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 gap-1.5 border-emerald-500/30 text-xs text-emerald-700 hover:border-emerald-500/60 hover:bg-emerald-500/5 dark:text-emerald-400"
                            onClick={handleAutoDescribe}
                            disabled={isDescribing || !hasVisionProvider()}
                          >
                            {isDescribing ? (
                              <>
                                <LoaderCircle
                                  size={12}
                                  className="animate-spin"
                                />
                                Scanning frame…
                              </>
                            ) : (
                              <>
                                <ScanEye size={12} />
                                Auto-describe → Scene Lock
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-56">
                          {hasVisionProvider()
                            ? "AI will analyze this frame's image and write a detailed character/scene description into Scene & Character Lock (Generation settings)."
                            : "Requires a Gemini or OpenAI API key configured in Settings."}
                        </TooltipContent>
                      </Tooltip>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 shrink-0 px-2 text-[10px] text-muted-foreground/80 hover:bg-muted/70 hover:text-foreground"
                          >
                            Base prompt
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="end"
                          className="w-80 max-w-[calc(100vw-2rem)] space-y-2 p-3"
                        >
                          <p className="text-[11px] font-semibold tracking-wide text-foreground/80">
                            Auto-describe base prompt
                          </p>
                          <ScrollArea className="h-56 rounded-md border border-border/60 bg-muted/20 p-2.5">
                            <pre className="m-0 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {AUTO_DESCRIBE_BASE_PROMPT}
                            </pre>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {describeError && (
                      <p className="text-[10px] leading-relaxed text-destructive/80">
                        {describeError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/30">
                  <FrameSelectIcon />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-semibold text-muted-foreground">
                    No frame selected
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground/50">
                    Click a frame in the timeline
                    <br />
                    below to edit it
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Generate All Pending ─────────────────────── */}
          {pendingCount > 0 && (
            <div className="px-4 py-3">
              <Button
                variant="outline"
                onClick={handleGenerateAll}
                disabled={isGenerating || pendingCount === 0}
                className="h-8 w-full gap-2 border-border/60 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {isGenerating ? (
                  <>
                    <SpinnerIcon />
                    Generating batch…
                  </>
                ) : (
                  <>
                    <PlayAllIcon />
                    Generate All Pending
                    <Badge
                      variant="secondary"
                      className="ml-0.5 h-4 min-w-4 justify-center px-1 text-[9px] font-bold"
                    >
                      {pendingCount}
                    </Badge>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Section: Quick Animation ───────────────────────────── */}
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Quick Animation
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <Textarea
                value={batchPrompt}
                onChange={(e) => setBatchPrompt(e.target.value)}
                placeholder='Base prompt for all frames (e.g. "a cat walking")'
                className="min-h-14 resize-none border-border/60 bg-background/60 text-sm placeholder:text-muted-foreground/35 focus-visible:border-primary/50 focus-visible:ring-primary/20"
              />

              {/* Count controls + Create button */}
              <div className="flex items-center gap-2">
                {/* Frame count input */}
                <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 py-1">
                  <span className="text-[10px] text-muted-foreground">
                    Frames
                  </span>
                  <input
                    type="number"
                    min={BATCH_MIN}
                    max={BATCH_MAX}
                    value={batchCount}
                    onChange={(e) =>
                      setBatchCount(
                        Math.max(
                          BATCH_MIN,
                          Math.min(BATCH_MAX, Number(e.target.value))
                        )
                      )
                    }
                    className="w-8 bg-transparent text-center text-sm font-bold text-foreground outline-none"
                  />
                </div>

                {/* Quick presets */}
                <div className="flex gap-1">
                  {[4, 8, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBatchCount(n)}
                      className={cn(
                        "h-6 rounded px-1.5 text-[10px] font-semibold transition-colors",
                        batchCount === n
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleBatchCreate}
                  disabled={isGenerating || !batchPrompt.trim()}
                  className="ml-auto h-7 gap-1.5 text-xs"
                >
                  <SparklesIcon size={11} />
                  Create
                </Button>
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground/50">
                {generationCapabilities.supportsReferenceFrame
                  ? `Creates ${batchCount} prompts and generates them sequentially, reusing each finished frame as the visual reference for the next one.`
                  : `Creates ${batchCount} prompts and generates them sequentially. ${providerLabel} does not reuse the previous frame as a visual reference — a consistent seed and Scene & Character Lock are used to reduce drift.`}
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({
  status,
  staleLabel = "Needs Refresh",
}: {
  status: string
  staleLabel?: string
}) {
  const config = {
    done: {
      dot: "bg-emerald-400 shadow-[0_0_5px_1px] shadow-emerald-400/40",
      text: "text-emerald-500 dark:text-emerald-400",
      label: "Done",
    },
    generating: {
      dot: "bg-amber-400 animate-pulse shadow-[0_0_5px_1px] shadow-amber-400/40",
      text: "text-amber-500 dark:text-amber-400",
      label: "Generating",
    },
    error: {
      dot: "bg-red-400 shadow-[0_0_5px_1px] shadow-red-400/40",
      text: "text-red-500 dark:text-red-400",
      label: "Error",
    },
    stale: {
      dot: "bg-amber-400 shadow-[0_0_5px_1px] shadow-amber-400/40",
      text: "text-amber-600 dark:text-amber-300",
      label: staleLabel,
    },
    idle: {
      dot: "bg-muted-foreground/30",
      text: "text-muted-foreground/50",
      label: "Idle",
    },
  }[status] ?? {
    dot: "bg-muted-foreground/30",
    text: "text-muted-foreground/50",
    label: status,
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      <span className={cn("text-[10px] font-semibold", config.text)}>
        {config.label}
      </span>
    </div>
  )
}
