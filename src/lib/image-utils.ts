/**
 * Client-side image manipulation utilities.
 * All functions accept an image source (URL or data URL) and return a data URL.
 */

const transparentImageCache = new Map<string, string>();

async function loadImage(src: string): Promise<HTMLImageElement> {
  // Data URLs / blob URLs: load directly (no CORS issues)
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }

  // External URLs: fetch as blob to avoid canvas taint
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };
      img.src = objectUrl;
    });
  } catch {
    // Fallback: try loading directly with crossOrigin
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }
}

export async function rotateImage(
  src: string,
  degrees: 90 | -90 | 180,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  if (degrees === 90 || degrees === -90) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  return canvas.toDataURL("image/png");
}

export async function flipImage(
  src: string,
  horizontal: boolean,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  if (horizontal) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }

  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function removeBackground(
  src: string,
  tolerance = 30,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    throw new Error(
      "Cannot process this image due to cross-origin restrictions.",
    );
  }

  const { data } = imageData;
  const w = canvas.width;
  const h = canvas.height;

  // Sample corner pixels for background color reference
  const corners = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
  ];

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const idx of corners) {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  }
  bgR = Math.round(bgR / 4);
  bgG = Math.round(bgG / 4);
  bgB = Math.round(bgB / 4);

  // Flood fill from all edges
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  for (let x = 0; x < w; x++) {
    queue.push(x);
    queue.push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    queue.push(y * w);
    queue.push(y * w + (w - 1));
  }

  const tolSq = tolerance * tolerance;

  while (queue.length > 0) {
    const pixelIdx = queue.pop()!;
    if (visited[pixelIdx]) continue;

    const di = pixelIdx * 4;
    const dr = data[di] - bgR;
    const dg = data[di + 1] - bgG;
    const db = data[di + 2] - bgB;
    if (dr * dr + dg * dg + db * db > tolSq) continue;

    visited[pixelIdx] = 1;
    data[di + 3] = 0; // Set alpha to 0

    const x = pixelIdx % w;
    const y = (pixelIdx - x) / w;

    if (x > 0) queue.push(pixelIdx - 1);
    if (x < w - 1) queue.push(pixelIdx + 1);
    if (y > 0) queue.push(pixelIdx - w);
    if (y < h - 1) queue.push(pixelIdx + w);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function createSolidColorImage(
  color: string,
  width: number,
  height: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create a color-filled image.");
  }

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL("image/png");
}

export function createTransparentImage(width: number, height: number): string {
  const cacheKey = `${width}x${height}`;
  const cached = transparentImageCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create a transparent placeholder image.");
  }

  ctx.clearRect(0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  transparentImageCache.set(cacheKey, dataUrl);
  return dataUrl;
}
