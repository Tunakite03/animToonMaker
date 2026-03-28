import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  selectActiveAnimation,
  selectActiveFrames,
  useAnimationStore,
} from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
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
  FolderIcon,
  GifIcon,
  SpinnerIcon,
  VideoIcon,
} from "@/components/icons"
import { cn } from "@/lib/utils"
import { FormatCard } from "@/components/export-panel/format-card"
import {
  createBaseFileName,
  createExportCanvas,
  createExportFolderViaRust,
  createFrameSequenceManifest,
  createSequenceFolderName,
  drawBlankFrame,
  drawImageFrame,
  downloadBlob,
  estimateExportSizeMb,
  estimateVideoBitrate,
  getExportOutputLabel,
  getFrameDuration,
  getPrimaryExportLabel,
  getSupportedWebmMimeType,
  isTauriDesktopRuntime,
  isUserCancelledExport,
  joinPath,
  loadImages,
  mapQualityToGifSample,
  pickExportDirectoryWithNativeDialog,
  processPngSequenceFrames,
  saveBlobViaRust,
  saveBlobWithNativeDialog,
  sleep,
  waitForNextFrame,
} from "@/components/export-panel/utils"

type ExportNoticeKind = "success" | "error"

interface ExportNotice {
  kind: ExportNoticeKind
  message: string
}

export function ExportPanel() {
  const frames = useAnimationStore(selectActiveFrames)
  const { fps, projectName, selectedAnimationName } = useAnimationStore(
    useShallow((state) => ({
      fps: state.project.fps,
      projectName: state.project.name,
      selectedAnimationName: selectActiveAnimation(state)?.name ?? "animation",
    }))
  )

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
  const [exportNotice, setExportNotice] = useState<ExportNotice | null>(null)
  const [open, setOpen] = useState(false)
  const exportNoticeTimeoutRef = useRef<number | null>(null)

  const playableFrames = useMemo(
    () => frames.filter((frame) => frame.imageUrl || frame.imageAssetId),
    [frames]
  )
  const canExport = playableFrames.length > 0
  const outputWidth = canvasWidth * exportScale
  const outputHeight = canvasHeight * exportScale
  const canExportToDirectory = isTauriDesktopRuntime()
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
  const projectBaseFileName = useMemo(
    () => createBaseFileName(projectName || "animation"),
    [projectName]
  )
  const animationBaseFileName = useMemo(
    () => createBaseFileName(selectedAnimationName || "animation"),
    [selectedAnimationName]
  )

  const showExportNotice = useCallback(
    (kind: ExportNoticeKind, message: string) => {
      setExportNotice({ kind, message })

      if (exportNoticeTimeoutRef.current !== null) {
        window.clearTimeout(exportNoticeTimeoutRef.current)
      }

      exportNoticeTimeoutRef.current = window.setTimeout(() => {
        setExportNotice(null)
        exportNoticeTimeoutRef.current = null
      }, 4000)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (exportNoticeTimeoutRef.current !== null) {
        window.clearTimeout(exportNoticeTimeoutRef.current)
      }
    }
  }, [])

  const cancelExport = useCallback(() => {
    setExporting(false)
    setProgress(0)
    setProgressLabel("")
  }, [])

  const finishExport = useCallback(
    (label: string) => {
      setProgress(100)
      setProgressLabel(label)
      showExportNotice("success", label)

      window.setTimeout(() => {
        setExporting(false)
        setProgress(0)
        setProgressLabel("")
      }, 1200)
    },
    [showExportNotice]
  )

  const failExport = useCallback(
    (error: unknown) => {
      console.error("Export failed:", error)
      setExporting(false)
      const message = error instanceof Error ? error.message : "Export failed."
      setProgressLabel(message)
      showExportNotice("error", message)
    },
    [showExportNotice]
  )

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

      const saved = await saveBlobWithNativeDialog({
        blob,
        defaultPath: `${projectBaseFileName}-${Date.now()}.gif`,
        fallbackFileName: `${projectBaseFileName}-${Date.now()}.gif`,
        title: "Save GIF",
        filters: [{ name: "GIF", extensions: ["gif"] }],
      })

      if (!saved) {
        cancelExport()
        return
      }

      finishExport("GIF saved.")
    } catch (error) {
      if (isUserCancelledExport(error)) {
        cancelExport()
        return
      }

      failExport(error)
    }
  }, [
    cancelExport,
    projectBaseFileName,
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
      const saved = await saveBlobWithNativeDialog({
        blob,
        defaultPath: `${projectBaseFileName}-${Date.now()}.webm`,
        fallbackFileName: `${projectBaseFileName}-${Date.now()}.webm`,
        title: "Save WebM",
        filters: [{ name: "WebM video", extensions: ["webm"] }],
      })

      if (!saved) {
        cancelExport()
        return
      }

      finishExport("WebM saved.")
    } catch (error) {
      if (isUserCancelledExport(error)) {
        cancelExport()
        return
      }

      failExport(error)
    } finally {
      tracks.forEach((track) => track.stop())
    }
  }, [
    cancelExport,
    projectBaseFileName,
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
      await processPngSequenceFrames({
        images,
        width: outputWidth,
        height: outputHeight,
        baseFileName: animationBaseFileName,
        onFrame: async ({ blob, fileName, index, total }) => {
          downloadBlob(blob, fileName)
          setProgress(Math.round(((index + 1) / total) * 100))
          await sleep(32)
        },
      })

      finishExport("PNG sequence ready.")
    } catch (error) {
      failExport(error)
    }
  }, [
    animationBaseFileName,
    canExport,
    failExport,
    finishExport,
    outputHeight,
    outputWidth,
    playableFrames,
  ])

  const exportFramesFolder = useCallback(async () => {
    if (!canExport) return

    if (!isTauriDesktopRuntime()) {
      await downloadPngSequence()
      return
    }

    setExporting(true)
    setProgress(0)
    setProgressLabel("Preparing frames folder...")

    try {
      const images = await loadImages(playableFrames)
      const selectedDirectory = await pickExportDirectoryWithNativeDialog()
      if (!selectedDirectory) {
        cancelExport()
        return
      }

      const exportFolderName = createSequenceFolderName(
        projectBaseFileName,
        animationBaseFileName
      )
      const { outputDir } = await createExportFolderViaRust({
        baseOutputDir: selectedDirectory,
        folderName: exportFolderName,
      })

      await processPngSequenceFrames({
        images,
        width: outputWidth,
        height: outputHeight,
        baseFileName: animationBaseFileName,
        onFrame: async ({ blob, fileName, index, total }) => {
          setProgressLabel(`Writing frame ${index + 1} of ${total}...`)
          await saveBlobViaRust(joinPath(outputDir, fileName), blob)
          setProgress(Math.round(((index + 1) / total) * 90))
        },
      })

      setProgress(94)
      setProgressLabel("Writing animation manifest...")
      const manifest = JSON.stringify(
        createFrameSequenceManifest({
          baseFileName: animationBaseFileName,
          fps,
          frameCount: playableFrames.length,
          frames: playableFrames,
          animationName: selectedAnimationName,
          height: outputHeight,
          projectName,
          width: outputWidth,
        }),
        null,
        2
      )
      await saveBlobViaRust(
        joinPath(outputDir, "animation.json"),
        new Blob([manifest], { type: "application/json" })
      )

      finishExport("Frames folder saved.")
    } catch (error) {
      if (isUserCancelledExport(error)) {
        cancelExport()
        return
      }

      failExport(error)
    }
  }, [
    animationBaseFileName,
    canExport,
    cancelExport,
    downloadPngSequence,
    failExport,
    finishExport,
    fps,
    outputHeight,
    outputWidth,
    playableFrames,
    projectBaseFileName,
    projectName,
    selectedAnimationName,
  ])

  const handleExport = useCallback(() => {
    if (exportFormat === "gif") {
      void exportGif()
      return
    }

    if (exportFormat === "frames") {
      void exportFramesFolder()
      return
    }

    void exportWebm()
  }, [exportFormat, exportFramesFolder, exportGif, exportWebm])

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

      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
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
            <div className="grid grid-cols-3 gap-2">
              <FormatCard
                selected={exportFormat === "gif"}
                onSelect={() => setExportFormat("gif")}
                icon={<GifIcon />}
                title="Animated GIF"
                description=""
                badge=""
              />
              <FormatCard
                selected={exportFormat === "webm"}
                onSelect={() => setExportFormat("webm")}
                icon={<VideoIcon />}
                title="WebM Video"
                description=""
                badge=""
              />
              <FormatCard
                selected={exportFormat === "frames"}
                onSelect={() => setExportFormat("frames")}
                icon={<FolderIcon />}
                title="PNG Frames"
                description=""
                badge=""
              />
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3 text-[11px]">
              <span className="shrink-0 text-muted-foreground">Output</span>
              <span className="min-w-0 text-right font-medium wrap-break-word text-foreground/80">
                {getExportOutputLabel(
                  exportFormat,
                  playableFrames.length,
                  estimatedSizeMb
                )}
              </span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
              <span className="shrink-0 text-muted-foreground">Resolution</span>
              <span className="min-w-0 text-right font-medium wrap-break-word text-foreground/80">
                {outputWidth} x {outputHeight} px
              </span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
              <span className="shrink-0 text-muted-foreground">Quality</span>
              <span className="min-w-0 text-right font-medium wrap-break-word text-foreground/80">
                {exportFormat === "frames"
                  ? `Lossless PNG at ${exportScale}x scale`
                  : `${exportQuality}% at ${exportScale}x scale`}
              </span>
            </div>
            <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
              <span className="shrink-0 text-muted-foreground">Duration</span>
              <span className="min-w-0 text-right font-medium wrap-break-word text-foreground/80">
                {durationSec}s at {fps} FPS
              </span>
            </div>
            {exportFormat === "frames" ? (
              <div className="mt-1 flex items-start justify-between gap-3 text-[11px]">
                <span className="shrink-0 text-muted-foreground">Delivery</span>
                <span className="min-w-0 text-right font-medium wrap-break-word text-foreground/80">
                  {canExportToDirectory
                    ? "Folder export + manifest"
                    : "PNG downloads fallback"}
                </span>
              </div>
            ) : null}
          </div>

          {exporting ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-3 text-[11px]">
                <span className="min-w-0 flex-1 wrap-break-word text-muted-foreground">
                  {progressLabel}
                </span>
                <span className="shrink-0 font-medium text-foreground/70 tabular-nums">
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
              "h-9 w-full min-w-0 gap-2 overflow-hidden font-medium",
              progress === 100 && "bg-emerald-600 hover:bg-emerald-600/90"
            )}
          >
            {exporting ? (
              <>
                <SpinnerIcon className="shrink-0" />
                <span className="min-w-0 truncate">
                  {progressLabel || "Exporting..."}
                </span>
              </>
            ) : progress === 100 ? (
              <>
                <CheckIcon className="shrink-0" />
                <span className="min-w-0 truncate">Completed</span>
              </>
            ) : (
              <>
                <ExportIcon size={14} className="shrink-0" />
                <span className="min-w-0 truncate">
                  {getPrimaryExportLabel(exportFormat)}
                </span>
              </>
            )}
          </Button>

          {exportNotice ? (
            <div
              role={exportNotice.kind === "error" ? "alert" : "status"}
              aria-live="polite"
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium",
                exportNotice.kind === "error"
                  ? "border-destructive/35 bg-destructive/10 text-destructive"
                  : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {exportNotice.message}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
