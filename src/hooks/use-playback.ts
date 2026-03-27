import { useCallback, useEffect, useRef } from "react";

/**
 * Preload an array of image URLs into HTMLImageElement objects.
 * Returns a Map<url, HTMLImageElement> for O(1) lookup.
 */
export function useImagePreloader() {
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const preload = useCallback((urls: string[]): Promise<Map<string, HTMLImageElement>> => {
    const cache = cacheRef.current;
    const promises: Promise<void>[] = [];

    for (const url of urls) {
      if (cache.has(url)) continue;
      promises.push(
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            cache.set(url, img);
            resolve();
          };
          img.onerror = () => {
            // Still resolve so we don't block playback
            resolve();
          };
          img.src = url;
        }),
      );
    }

    return Promise.all(promises).then(() => cache);
  }, []);

  const getImage = useCallback((url: string): HTMLImageElement | undefined => {
    return cacheRef.current.get(url);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { preload, getImage, clearCache, cacheRef };
}

/**
 * High-precision playback loop using requestAnimationFrame with
 * accumulated delta time to avoid frame drops.
 */
export function usePlaybackLoop(
  onTick: (frameIndex: number) => void,
  deps: {
    isPlaying: boolean;
    frames: { duration: number; imageUrl: string | null }[];
    loop: boolean;
  },
) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const frameIndexRef = useRef<number>(0);

  const { isPlaying, frames, loop } = deps;

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const reset = useCallback(() => {
    frameIndexRef.current = 0;
    accumulatedRef.current = 0;
    lastTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      stop();
      return;
    }

    // Only play frames that have images
    const playableFrames = frames.filter((f) => f.imageUrl);
    if (playableFrames.length === 0) {
      stop();
      return;
    }

    lastTimeRef.current = 0;
    accumulatedRef.current = 0;

    const tick = (now: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
      }

      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      accumulatedRef.current += delta;

      const currentIdx = frameIndexRef.current;
      const frameDuration = playableFrames[currentIdx]?.duration ?? 83;

      if (accumulatedRef.current >= frameDuration) {
        accumulatedRef.current -= frameDuration;

        let nextIdx = currentIdx + 1;
        if (nextIdx >= playableFrames.length) {
          if (loop) {
            nextIdx = 0;
          } else {
            // Stop at the last frame
            onTick(playableFrames.length - 1);
            return;
          }
        }

        frameIndexRef.current = nextIdx;
        onTick(nextIdx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    // Emit the first frame immediately
    onTick(frameIndexRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => stop();
  }, [isPlaying, frames, loop, onTick, stop]);

  return { stop, reset, frameIndexRef };
}
