import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useAnimationStore } from "@/store/animation-store"
import { useSettingsStore, type ExportFormat } from "@/store/settings-store"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckIcon,
  ExportIcon,
  GifIcon,
  SpinnerIcon,
  VideoIcon,
} from "@/components/icons"
import { cn } from "@/lib/utils"

const WEBM_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const

export function ExportPanel() {
  const frames = useAnimationStore((state) => {
    const anim = state.project.animations.find(
      (a) => a.id === state.project.selectedAnimationId
    )
    return anim?.frames ?? []
  })
  const fps = useAnimationStore((state) => state.project.fps)
  const projectName = useAnimationStore((state) => state.project.name)

  const exportFormat = useSettingsStore((state) => state.exportFormat)
  const exportQuality = useSettingsStore((state) => state.exportQuality)
  const exportScale = useSettingsStore((state) => state.exportScale)
  const canvasWidth = useSettingsStore((state) => state.canvasWidth)
  const canvasHeight = useSettingsStore((state) => state.canvasHeight)
  const canvasBackground = useSettingsStore((state) => state.canvasBackground)
  const setExportFormat = useSettingsStore((state) => state.setExportFormat)

  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState("")
  const [open, setOpen] = useState(false)

  const playableFrames = useMemo(
    () => frames.filter((frame) => frame.imageUrl),
    [frames]
  )
  const canExport = playableFrames.length > 0
  const outputWidth = canvasWidth * exportScale
  const outputHeight = canvasHeight * exportScale
  const totalDurationMs = useMemo(
    () =>
      playableFrames.reduce(
        (sum, frame) => sum + getFrameDuration(frame.duration, fps),
        0
      ),
    [fps, playableFrames]
  )
  const durationSec = (totalDurationMs / 1000).toFixed(1)
  const estimatedSizeMb = useMemo(
    () =>
      estimateExportSizeMb({
        frameCount: playableFrames.length,
        width: outputWidth,
        height: outputHeight,
        durationMs: totalDurationMs,
        format: exportFormat,
        quality: exportQuality,
      }),
    [
      exportFormat,
      exportQuality,
      outputHeight,
      outputWidth,
      playableFrames.length,
      totalDurationMs,
    ]
  )
  const baseFileName = useMemo(
    () => createBaseFileName(projectName || "animation"),
    [projectName]
  )

  const finishExport = useCallback((label: string) => {
    setProgress(100)
    setProgressLabel(label)

    window.setTimeout(() => {
      setExporting(false)
      setProgress(0)
      setProgressLabel("")
    }, 1200)
  }, [])

  const failExport = useCallback((error: unknown) => {
    console.error("Export failed:", error)
    setExporting(false)
    setProgressLabel(error instanceof Error ? error.message : "Export failed.")
  }, [])

  const exportGif = useCallback(async () => {
    if (!canExport) return

    setExporting(true)
    setProgress(0)
    setProgressLabel("Loading frames...")

    try {
      const images = await loadImages(playableFrames)
      const { default: GIF } = await import("gif.js")
      const canvas = createExportCanvas(outputWidth, outputHeight)
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Canvas export is unavailable.")
      }

      const gif = new GIF({
        workers: 2,
        quality: mapQualityToGifSample(exportQuality),
        width: outputWidth,
        height: outputHeight,
        workerScript: "/gif.worker.js",
        background: canvasBackground,
      })

      setProgressLabel("Preparing GIF...")

      images.forEach((image, index) => {
        drawImageFrame(
          context,
          image,
          outputWidth,
          outputHeight,
          canvasBackground
        )
        gif.addFrame(context, {
          copy: true,
          delay: getFrameDuration(playableFrames[index].duration, fps),
        })
        setProgress(15 + Math.round(((index + 1) / images.length) * 35))
      })

      setProgressLabel("Encoding GIF...")

      const blob = await new Promise<Blob>((resolve) => {
        gif.on("progress", (value: number) => {
          setProgress(50 + Math.round(value * 45))
        })
        gif.on("finished", resolve)
        gif.render()
      })

      downloadBlob(blob, `${baseFileName}-${Date.now()}.gif`)
      finishExport("GIF ready.")
    } catch (error) {
      failExport(error)
    }
  }, [
    baseFileName,
    canExport,
    canvasBackground,
    exportQuality,
    failExport,
    finishExport,
    fps,
    outputHeight,
    outputWidth,
    playableFrames,
  ])

  const exportWebm = useCallback(async () => {
    if (!canExport) return

    if (typeof MediaRecorder === "undefined") {
      failExport(new Error("WebM export is not supported in this environment."))
      return
    }

    const mimeType = getSupportedWebmMimeType()
    if (!mimeType) {
      failExport(new Error("No supported WebM encoder was found."))
      return
    }

    setExporting(true)
    setProgress(0)
    setProgressLabel("Loading frames...")

    let tracks: MediaStreamTrack[] = []

    try {
      const images = await loadImages(playableFrames)
      const canvas = createExportCanvas(outputWidth, outputHeight)
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Canvas export is unavailable.")
      }

      drawBlankFrame(context, outputWidth, outputHeight, canvasBackground)

      const stream = canvas.captureStream(Math.max(1, fps))
      tracks = stream.getTracks()
      const chunks: BlobPart[] = []
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: estimateVideoBitrate(
          outputWidth,
          outputHeight,
          exportQuality,
          fps
        ),
      })

      const stopped = new Promise<void>((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }
        recorder.onerror = () => {
          reject(new Error("WebM export failed."))
        }
        recorder.onstop = () => resolve()
      })

      setProgressLabel("Recording WebM...")
      recorder.start(250)
      await waitForNextFrame()

      for (let index = 0; index < images.length; index += 1) {
        drawImageFrame(
          context,
          images[index],
          outputWidth,
          outputHeight,
          canvasBackground
        )
        setProgress(15 + Math.round(((index + 1) / images.length) * 75))
        await sleep(getFrameDuration(playableFrames[index].duration, fps))
      }

      recorder.stop()
      await stopped

      const blob = new Blob(chunks, { type: mimeType })
      downloadBlob(blob, `${baseFileName}-${Date.now()}.webm`)
      finishExport("WebM ready.")
    } catch (error) {
      failExport(error)
    } finally {
      tracks.forEach((track) => track.stop())
    }
  }, [
    baseFileName,
    canExport,
    canvasBackground,
    exportQuality,
    failExport,
    finishExport,
    fps,
    outputHeight,
    outputWidth,
    playableFrames,
  ])

  const downloadPngSequence = useCallback(async () => {
    if (!canExport) return

    setExporting(true)
    setProgress(0)
    setProgressLabel("Preparing PNG sequence...")

    try {
      const images = await loadImages(playableFrames)
      const canvas = createExportCanvas(outputWidth, outputHeight)
      const context = canvas.getContext("2d")

      if (!context) {
        throw new Error("Canvas export is unavailable.")
      }

      for (let index = 0; index < images.length; index += 1) {
        drawImageFrame(
          context,
          images[index],
          outputWidth,
          outputHeight,
          canvasBackground
        )

        const blob = await canvasToBlob(canvas, "image/png")
        downloadBlob(
          blob,
          `${baseFileName}-${String(index + 1).padStart(3, "0")}.png`
        )
        setProgress(Math.round(((index + 1) / images.length) * 100))
        await sleep(32)
      }

      finishExport("PNG sequence ready.")
    } catch (error) {
      failExport(error)
    }
  }, [
    baseFileName,
    canExport,
    canvasBackground,
    failExport,
    finishExport,
    outputHeight,
    outputWidth,
    playableFrames,
  ])

  const handleExport = useCallback(() => {
    if (exportFormat === "gif") {
      void exportGif()
      return
    }

    void exportWebm()
  }, [exportFormat, exportGif, exportWebm])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={!canExport}
          className={cn(
            "h-7 gap-1.5 border-border/60 text-xs font-medium",
            "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
            "disabled:opacity-40"
          )}
        >
          <ExportIcon size={12} />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ExportIcon size={16} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Export Animation
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                {playableFrames.length} frames | {fps} FPS | ~{durationSec}s
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Format
            </span>
            <div className="grid grid-cols-2 gap-2">
              <FormatCard
                selected={exportFormat === "gif"}
                onSelect={() => setExportFormat("gif")}
                icon={<GifIcon />}
                title="Animated GIF"
                description="Shareable everywhere, single file output"
                badge="Compatible"
              />
              <FormatCard
                selected={exportFormat === "webm"}
                onSelect={() => setExportFormat("webm")}
                icon={<VideoIcon />}
                title="WebM Video"
                description="Smaller output with better quality retention"
                badge="Smaller"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Output</span>
              <span className="font-medium text-foreground/80">
                1 {exportFormat.toUpperCase()} file | ~{estimatedSizeMb} MB
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Resolution</span>
              <span className="font-medium text-foreground/80">
                {outputWidth} x {outputHeight} px
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Quality</span>
              <span className="font-medium text-foreground/80">
                {exportQuality}% at {exportScale}x scale
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground/80">
                {durationSec}s at {fps} FPS
              </span>
            </div>
          </div>

          {exporting ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{progressLabel}</span>
                <span className="font-medium text-foreground/70 tabular-nums">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          ) : null}

          <Button
            onClick={handleExport}
            disabled={exporting || !canExport}
            className={cn(
              "h-9 gap-2 font-medium",
              progress === 100 && "bg-emerald-600 hover:bg-emerald-600/90"
            )}
          >
            {exporting ? (
              <>
                <SpinnerIcon />
                {progressLabel || "Exporting..."}
              </>
            ) : progress === 100 ? (
              <>
                <CheckIcon />
                Downloaded
              </>
            ) : (
              <>
                <ExportIcon size={14} />
                {exportFormat === "gif" ? "Export GIF" : "Export WebM"}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              void downloadPngSequence()
            }}
            disabled={exporting || !canExport}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Download PNG sequence
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormatCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  badge,
}: {
  selected: boolean
  onSelect: () => void
  icon: ReactNode
  title: string
  description: string
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/8 shadow-[0_0_0_1px] shadow-primary/20"
          : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div
        className={cn(
          "absolute top-2.5 right-2.5 h-4 w-4 rounded-full border-2 transition-all",
          selected
            ? "border-primary bg-primary"
            : "border-border/60 bg-transparent"
        )}
      >
        {selected ? (
          <svg
            className="absolute inset-0 m-auto"
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </div>

      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          selected
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          {badge ? (
            <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold tracking-wide text-primary uppercase">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </button>
  )
}

function loadImages(
  frames: Array<{ imageUrl?: string | null }>
): Promise<HTMLImageElement[]> {
  return Promise.all(
    frames.map((frame) => {
      if (!frame.imageUrl) {
        return Promise.reject(new Error("A frame is missing its image data."))
      }

      return loadImage(frame.imageUrl)
    })
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Failed to load frame: ${src}`))
    image.src = src
  })
}

function createExportCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

function drawBlankFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: string
) {
  context.clearRect(0, 0, width, height)
  context.fillStyle = background
  context.fillRect(0, 0, width, height)
}

function drawImageFrame(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  background: string
) {
  drawBlankFrame(context, width, height, background)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, width, height)
}

function getFrameDuration(duration: number | undefined, fps: number) {
  if (
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    return duration
  }

  return Math.max(16, Math.round(1000 / Math.max(fps, 1)))
}

function mapQualityToGifSample(quality: number) {
  const normalized = Math.min(100, Math.max(1, quality))
  return Math.max(1, Math.round(31 - normalized * 0.3))
}

function estimateVideoBitrate(
  width: number,
  height: number,
  quality: number,
  fps: number
) {
  const qualityFactor = 0.35 + quality / 100
  return Math.round(width * height * Math.max(fps, 1) * qualityFactor)
}

function estimateExportSizeMb({
  frameCount,
  width,
  height,
  durationMs,
  format,
  quality,
}: {
  frameCount: number
  width: number
  height: number
  durationMs: number
  format: ExportFormat
  quality: number
}) {
  const megapixels = (width * height) / 1_000_000
  const durationSec = Math.max(durationMs / 1000, frameCount / 12, 0.1)
  const qualityFactor = 0.35 + quality / 100

  const estimatedMb =
    format === "gif"
      ? frameCount * megapixels * (0.4 + qualityFactor * 0.45)
      : durationSec * megapixels * (0.7 + qualityFactor * 0.6)

  return estimatedMb.toFixed(1)
}

function getSupportedWebmMimeType() {
  return WEBM_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

function createBaseFileName(projectName: string) {
  const normalized = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "animation"
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode the canvas output."))
        return
      }

      resolve(blob)
    }, type)
  })
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}
