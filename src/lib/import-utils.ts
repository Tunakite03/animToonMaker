import { MAX_FRAMES } from "@/lib/constants";

const IMAGE_PATH_PATTERN = /\.(png|jpe?g|gif|webp|bmp|tiff?|avif|svg)$/i;

export type ImportedImage = {
  imageUrl: string;
  prompt: string;
};

function readFileAsDataUrl(
  file: File,
): Promise<ImportedImage | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        imageUrl: reader.result as string,
        prompt: file.name.replace(/\.[^.]+$/, ""),
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function readImageFile(
  file: File,
): Promise<ImportedImage | null> {
  if (!file.type.startsWith("image/")) return null;
  return readFileAsDataUrl(file);
}

export async function readImagePath(
  filePath: string,
): Promise<ImportedImage | null> {
  if (!IMAGE_PATH_PATTERN.test(filePath)) return null;

  const { invoke } = await import("@tauri-apps/api/core");

  try {
    const dataUrl = await invoke<string>("read_image_as_data_url", {
      path: filePath,
    });

    return {
      imageUrl: dataUrl,
      prompt: filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? "",
    };
  } catch (err) {
    console.error("[import] Failed to read image path:", filePath, err);
    return null;
  }
}

/**
 * Process browser File objects (from <input type="file"> or HTML5 drag-drop)
 * into animation frames by reading each as a base64 data URL.
 */
export async function processImageFiles(
  files: File[],
  currentFrameCount: number,
  addFrameWithImage: (imageUrl: string, prompt?: string) => string,
): Promise<void> {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) return;

  const remaining = MAX_FRAMES - currentFrameCount;
  if (remaining <= 0) return;

  const importedFiles = await Promise.all(
    imageFiles.slice(0, remaining).map(readImageFile),
  );

  for (const imported of importedFiles) {
    if (!imported) continue;
    addFrameWithImage(imported.imageUrl, imported.prompt);
  }
}

/**
 * Process OS file paths (from Tauri's onDragDropEvent) into animation frames.
 *
 * Uses the `read_image_as_data_url` Tauri command (defined in src-tauri/src/lib.rs)
 * which reads the file on the Rust side and returns a ready-made base64 data URL.
 * This approach is reliable on all platforms and avoids the asset:// protocol
 * pitfalls (ERR_CONNECTION_REFUSED in dev mode, permission config, etc.).
 *
 * Only call this inside a Tauri runtime. It dynamically imports
 * `@tauri-apps/api/core`, which is unavailable in browser-only dev mode.
 */
export async function processImagePaths(
  paths: string[],
  currentFrameCount: number,
  addFrameWithImage: (imageUrl: string, prompt?: string) => string,
): Promise<void> {
  const imagePaths = paths.filter((path) => IMAGE_PATH_PATTERN.test(path));
  if (imagePaths.length === 0) return;

  const remaining = MAX_FRAMES - currentFrameCount;
  if (remaining <= 0) return;

  const importedPaths = await Promise.all(
    imagePaths.slice(0, remaining).map(readImagePath),
  );

  for (const imported of importedPaths) {
    if (!imported) continue;
    addFrameWithImage(imported.imageUrl, imported.prompt);
  }
}
