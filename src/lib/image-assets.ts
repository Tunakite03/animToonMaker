import { nanoid } from "nanoid"

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
  "tif",
  "tiff",
])

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/tiff": "tiff",
}

export interface ImageAssetHandle {
  assetId: string
  imageUrl: string
}

export interface ImportedImageAssetHandle extends ImageAssetHandle {
  path: string
  prompt: string
}

interface SaveImageAssetRequest {
  bytesBase64: string
  extension?: string
}

interface SaveImageAssetResponse {
  assetId: string
  assetPath: string
}

interface ImportedImageAssetResponse {
  assetId: string
  assetPath: string
  path: string
  prompt: string
}

const assetUrlCache = new Map<string, string>()

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

function normalizeExtension(extension?: string | null): string | undefined {
  if (!extension) return undefined
  const normalized = extension.trim().toLowerCase().replace(/^\./, "")
  return IMAGE_EXTENSIONS.has(normalized) ? normalized : undefined
}

function extensionFromMime(mimeType?: string | null): string | undefined {
  if (!mimeType) return undefined
  return MIME_TO_EXTENSION[mimeType.toLowerCase()]
}

function extensionFromPath(pathOrName?: string | null): string | undefined {
  if (!pathOrName) return undefined
  const match = /\.([a-z0-9]+)$/i.exec(pathOrName)
  return normalizeExtension(match?.[1] ?? undefined)
}

function rememberImageAsset(assetId: string, imageUrl: string) {
  if (!assetId) return
  assetUrlCache.set(assetId, imageUrl)
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string) ?? "")
    reader.onerror = () => reject(new Error("Failed to convert image blob."))
    reader.readAsDataURL(blob)
  })
}

async function toAssetUrl(assetPath: string) {
  if (!isTauriRuntime()) {
    return assetPath
  }

  const { convertFileSrc } = await import("@tauri-apps/api/core")
  return convertFileSrc(assetPath)
}

async function fetchSourceAsBlob(source: string): Promise<Blob> {
  if (source.startsWith("data:")) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error("Failed to read image data.")
    }
    return response.blob()
  }

  if (isTauriRuntime() && /^https?:\/\//i.test(source)) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http")
    const response = await tauriFetch(source, { method: "GET" })
    if (!response.ok) {
      throw new Error("Failed to download image for asset storage.")
    }
    const contentType = response.headers.get("content-type")
    const bytes = await response.arrayBuffer()
    return new Blob([bytes], {
      type: contentType || "application/octet-stream",
    })
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error("Failed to fetch image source.")
  }
  return response.blob()
}

async function readDataUrlFromAssetPath(assetPath: string) {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<string>("read_image_as_data_url", { path: assetPath })
}

export function getCachedImageAssetUrl(assetId?: string | null) {
  if (!assetId) return null
  return assetUrlCache.get(assetId) ?? null
}

export async function resolveImageAssetUrl(
  assetId: string
): Promise<string | null> {
  const cached = getCachedImageAssetUrl(assetId)
  if (cached) return cached

  if (!isTauriRuntime()) {
    return null
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core")
    const assetPath = await invoke<string>("resolve_image_asset_path", {
      assetId,
    })
    const imageUrl = await toAssetUrl(assetPath)
    rememberImageAsset(assetId, imageUrl)
    return imageUrl
  } catch (error) {
    console.error(
      "[image-assets] Failed to resolve asset path:",
      assetId,
      error
    )
    return null
  }
}

export async function readImageAssetAsDataUrl(
  assetId: string
): Promise<string | null> {
  if (!assetId) return null

  if (!isTauriRuntime()) {
    const cached = getCachedImageAssetUrl(assetId)
    if (!cached) return null
    if (cached.startsWith("data:")) return cached
    return readImageSourceAsDataUrl(cached)
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core")
    const assetPath = await invoke<string>("resolve_image_asset_path", {
      assetId,
    })
    return await readDataUrlFromAssetPath(assetPath)
  } catch (error) {
    console.error(
      "[image-assets] Failed to read asset as data URL:",
      assetId,
      error
    )
    return null
  }
}

export async function readImageSourceAsDataUrl(
  source: string
): Promise<string> {
  if (source.startsWith("data:")) {
    return source
  }

  const blob = await fetchSourceAsBlob(source)
  return blobToDataUrl(blob)
}

export async function getImageFrameDataUrl({
  assetId,
  imageUrl,
}: {
  assetId?: string | null
  imageUrl?: string | null
}): Promise<string | null> {
  if (assetId) {
    const dataUrl = await readImageAssetAsDataUrl(assetId)
    if (dataUrl) return dataUrl
  }

  if (imageUrl) {
    return readImageSourceAsDataUrl(imageUrl)
  }

  return null
}

export async function saveImageBlobAsAsset(
  blob: Blob,
  extensionHint?: string
): Promise<ImageAssetHandle> {
  if (!isTauriRuntime()) {
    const assetId = `mem-${nanoid()}`
    const imageUrl = await blobToDataUrl(blob)
    rememberImageAsset(assetId, imageUrl)
    return { assetId, imageUrl }
  }

  const extension =
    normalizeExtension(extensionHint) || extensionFromMime(blob.type) || "png"
  const request: SaveImageAssetRequest = {
    bytesBase64: await blobToBase64(blob),
    extension,
  }

  const { invoke } = await import("@tauri-apps/api/core")
  const result = await invoke<SaveImageAssetResponse>("save_image_asset", {
    request,
  })
  const imageUrl = await toAssetUrl(result.assetPath)
  rememberImageAsset(result.assetId, imageUrl)
  return { assetId: result.assetId, imageUrl }
}

export async function saveImageFileAsAsset(
  file: File
): Promise<ImageAssetHandle> {
  const extension =
    extensionFromPath(file.name) || extensionFromMime(file.type) || "png"
  return saveImageBlobAsAsset(file, extension)
}

export async function saveImageSourceAsAsset(
  source: string,
  extensionHint?: string
): Promise<ImageAssetHandle> {
  const blob = await fetchSourceAsBlob(source)
  const inferredExtension =
    normalizeExtension(extensionHint) ||
    extensionFromMime(blob.type) ||
    extensionFromPath(source) ||
    "png"
  return saveImageBlobAsAsset(blob, inferredExtension)
}

export async function importImagePathAsAsset(
  path: string
): Promise<ImportedImageAssetHandle | null> {
  if (!isTauriRuntime()) {
    return null
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core")
    const result = await invoke<ImportedImageAssetResponse>(
      "import_image_path_as_asset",
      { path }
    )
    const imageUrl = await toAssetUrl(result.assetPath)
    rememberImageAsset(result.assetId, imageUrl)
    return {
      assetId: result.assetId,
      imageUrl,
      path: result.path,
      prompt: result.prompt,
    }
  } catch (error) {
    console.error("[image-assets] Failed to import image path:", path, error)
    return null
  }
}

export async function importImagePathsAsAssets(paths: string[]) {
  if (!isTauriRuntime() || paths.length === 0) {
    return []
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core")
    const results = await invoke<ImportedImageAssetResponse[]>(
      "import_image_paths_as_assets",
      { paths }
    )

    const imported = await Promise.all(
      results.map(async (result) => {
        const imageUrl = await toAssetUrl(result.assetPath)
        rememberImageAsset(result.assetId, imageUrl)
        return {
          assetId: result.assetId,
          imageUrl,
          path: result.path,
          prompt: result.prompt,
        } satisfies ImportedImageAssetHandle
      })
    )

    return imported
  } catch (error) {
    console.error("[image-assets] Failed to import image paths:", error)
    return []
  }
}
