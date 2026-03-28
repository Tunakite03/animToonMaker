import type { ExportFormat } from "@/store/settings-store"
import { resolveImageAssetUrl } from "@/lib/image-assets"

const WEBM_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const

export interface ExportDialogFilter {
  name: string
  extensions: string[]
}

interface SaveBinaryFileRequest {
  outputPath: string
  bytesBase64: string
}

interface CreateExportFolderResponse {
  outputDir: string
}

export async function loadImages(
  frames: Array<{ imageUrl?: string | null; imageAssetId?: string | null }>
): Promise<HTMLImageElement[]> {
  return Promise.all(
    frames.map(async (frame) => {
      const resolvedImageUrl =
        frame.imageUrl ||
        (frame.imageAssetId
          ? await resolveImageAssetUrl(frame.imageAssetId)
          : null)

      if (!resolvedImageUrl) {
        throw new Error("A frame is missing its image data.")
      }

      return loadImage(resolvedImageUrl)
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

export function createExportCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

export function drawBlankFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  background?: string
) {
  context.clearRect(0, 0, width, height)
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
  }
}

export function drawImageFrame(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  background?: string
) {
  drawBlankFrame(context, width, height, background)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.drawImage(image, 0, 0, width, height)
}

export function getFrameDuration(duration: number | undefined, fps: number) {
  if (
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    return duration
  }

  return Math.max(16, Math.round(1000 / Math.max(fps, 1)))
}

export function mapQualityToGifSample(quality: number) {
  const normalized = Math.min(100, Math.max(1, quality))
  return Math.max(1, Math.round(31 - normalized * 0.3))
}

export function estimateVideoBitrate(
  width: number,
  height: number,
  quality: number,
  fps: number
) {
  const qualityFactor = 0.35 + quality / 100
  return Math.round(width * height * Math.max(fps, 1) * qualityFactor)
}

export function estimateExportSizeMb({
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
      : format === "frames"
        ? frameCount * megapixels * 1.35
        : durationSec * megapixels * (0.7 + qualityFactor * 0.6)

  return estimatedMb.toFixed(1)
}

export function getSupportedWebmMimeType() {
  return WEBM_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
}

export function createBaseFileName(projectName: string) {
  const normalized = projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "animation"
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
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

export async function processPngSequenceFrames({
  images,
  width,
  height,
  baseFileName,
  onFrame,
}: {
  images: HTMLImageElement[]
  width: number
  height: number
  baseFileName: string
  onFrame: (params: {
    blob: Blob
    fileName: string
    index: number
    total: number
  }) => Promise<void>
}) {
  const canvas = createExportCanvas(width, height)
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Canvas export is unavailable.")
  }

  for (let index = 0; index < images.length; index += 1) {
    drawImageFrame(context, images[index], width, height)

    await onFrame({
      blob: await canvasToBlob(canvas, "image/png"),
      fileName: createSequenceFileName(baseFileName, index),
      index,
      total: images.length,
    })
  }
}

export async function saveBlobWithNativeDialog({
  blob,
  defaultPath,
  fallbackFileName,
  title,
  filters,
}: {
  blob: Blob
  defaultPath: string
  fallbackFileName: string
  title: string
  filters: ExportDialogFilter[]
}) {
  if (!isTauriDesktopRuntime()) {
    downloadBlob(blob, fallbackFileName)
    return true
  }

  const outputPath = await pickSaveFilePathWithNativeDialog({
    defaultPath,
    filters,
    title,
  })

  if (!outputPath) {
    return false
  }

  await saveBlobViaRust(outputPath, blob)
  return true
}

export function createFrameSequenceManifest({
  baseFileName,
  fps,
  frameCount,
  frames,
  animationName,
  height,
  projectName,
  width,
}: {
  baseFileName: string
  fps: number
  frameCount: number
  frames: Array<{ duration?: number | undefined }>
  animationName: string
  height: number
  projectName: string
  width: number
}) {
  return {
    projectName,
    animationName,
    filePrefix: baseFileName,
    format: "png-sequence",
    fps,
    frameCount,
    width,
    height,
    exportedAt: new Date().toISOString(),
    frames: frames.map((frame, index) => ({
      index: index + 1,
      fileName: createSequenceFileName(baseFileName, index),
      durationMs: getFrameDuration(frame.duration, fps),
    })),
  }
}

export function createSequenceFileName(baseFileName: string, index: number) {
  return `${baseFileName}-${String(index + 1).padStart(3, "0")}.png`
}

export function createSequenceFolderName(
  projectBaseFileName: string,
  animationBaseFileName: string
) {
  return `${projectBaseFileName}-${animationBaseFileName}-${Date.now()}`
}

export function isTauriDesktopRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export function isUserCancelledExport(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true
  }

  return error instanceof Error && /(cancelled|canceled)/i.test(error.message)
}

export function getExportOutputLabel(
  format: ExportFormat,
  frameCount: number,
  estimatedSizeMb: string
) {
  if (format === "frames") {
    return `1 folder | ${frameCount} PNG files | ~${estimatedSizeMb} MB`
  }

  return `1 ${format.toUpperCase()} file | ~${estimatedSizeMb} MB`
}

export function getPrimaryExportLabel(format: ExportFormat) {
  if (format === "gif") return "Export GIF"
  if (format === "webm") return "Export WebM"
  return "Export Frames Folder"
}

export function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs)
  })
}

export function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function pickSaveFilePathWithNativeDialog({
  defaultPath,
  filters,
  title,
}: {
  defaultPath: string
  filters: ExportDialogFilter[]
  title: string
}) {
  const { save } = await import("@tauri-apps/plugin-dialog")
  const outputPath = await save({
    defaultPath,
    filters,
    title,
  })

  return typeof outputPath === "string" && outputPath.trim().length > 0
    ? outputPath
    : null
}

export async function pickExportDirectoryWithNativeDialog() {
  const { open } = await import("@tauri-apps/plugin-dialog")
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select output folder",
  })

  return typeof selected === "string" && selected.trim().length > 0
    ? selected
    : null
}

export async function saveBlobViaRust(outputPath: string, blob: Blob) {
  const { invoke } = await import("@tauri-apps/api/core")
  const request: SaveBinaryFileRequest = {
    outputPath,
    bytesBase64: await blobToBase64(blob),
  }
  await invoke("save_binary_file", { request })
}

export async function createExportFolderViaRust(params: {
  baseOutputDir: string
  folderName: string
}) {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<CreateExportFolderResponse>("create_export_folder", params)
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  return uint8ArrayToBase64(new Uint8Array(buffer))
}

export function joinPath(dir: string, fileName: string) {
  const normalized = dir.replace(/[\\/]+$/, "")
  const separator = normalized.includes("\\") ? "\\" : "/"
  return `${normalized}${separator}${fileName}`
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}
