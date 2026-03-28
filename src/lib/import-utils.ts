import { MAX_FRAMES } from "@/lib/constants"
import {
  importImagePathAsAsset,
  importImagePathsAsAssets,
  saveImageFileAsAsset,
} from "@/lib/image-assets"

const IMAGE_PATH_PATTERN = /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|svg)$/i

export type ImportedImage = {
  imageAssetId: string
  imageUrl: string
  prompt: string
}

export async function readImageFile(file: File): Promise<ImportedImage | null> {
  if (!file.type.startsWith("image/")) return null

  try {
    const asset = await saveImageFileAsAsset(file)
    return {
      imageAssetId: asset.assetId,
      imageUrl: asset.imageUrl,
      prompt: file.name.replace(/\.[^.]+$/, ""),
    }
  } catch (err) {
    console.error("[import] Failed to import image file:", file.name, err)
    return null
  }
}

export async function readImagePath(
  filePath: string
): Promise<ImportedImage | null> {
  if (!IMAGE_PATH_PATTERN.test(filePath)) return null

  const imported = await importImagePathAsAsset(filePath)
  if (!imported) return null

  return {
    imageAssetId: imported.assetId,
    imageUrl: imported.imageUrl,
    prompt: imported.prompt,
  }
}

/**
 * Process browser File objects (from <input type="file"> or HTML5 drag-drop)
 * into animation frames by storing them as asset handles first.
 */
export async function processImageFiles(
  files: File[],
  currentFrameCount: number,
  addFrameWithImage: (
    imageUrl: string,
    prompt?: string,
    imageAssetId?: string | null
  ) => string
): Promise<void> {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"))
  if (imageFiles.length === 0) return

  const remaining = MAX_FRAMES - currentFrameCount
  if (remaining <= 0) return

  const importedFiles = await Promise.all(
    imageFiles.slice(0, remaining).map(readImageFile)
  )

  for (const imported of importedFiles) {
    if (!imported) continue
    addFrameWithImage(imported.imageUrl, imported.prompt, imported.imageAssetId)
  }
}

/**
 * Process OS file paths (from Tauri's onDragDropEvent) into animation frames.
 *
 * Uses Tauri asset commands to copy source files into the app-managed asset
 * directory and return stable asset handles + webview URLs.
 *
 * Only call this inside a Tauri runtime. In browser-only mode this helper
 * will no-op because native path import APIs are unavailable.
 */
export async function processImagePaths(
  paths: string[],
  currentFrameCount: number,
  addFrameWithImage: (
    imageUrl: string,
    prompt?: string,
    imageAssetId?: string | null
  ) => string
): Promise<void> {
  const imagePaths = paths.filter((path) => IMAGE_PATH_PATTERN.test(path))
  if (imagePaths.length === 0) return

  const remaining = MAX_FRAMES - currentFrameCount
  if (remaining <= 0) return

  const limitedPaths = imagePaths.slice(0, remaining)

  const importedPaths = await importImagePathsAsAssets(limitedPaths)
  if (importedPaths.length > 0) {
    for (const imported of importedPaths) {
      addFrameWithImage(imported.imageUrl, imported.prompt, imported.assetId)
    }
    return
  }

  const fallbackImports = await Promise.all(limitedPaths.map(readImagePath))
  for (const imported of fallbackImports) {
    if (!imported) continue
    addFrameWithImage(imported.imageUrl, imported.prompt, imported.imageAssetId)
  }
}
