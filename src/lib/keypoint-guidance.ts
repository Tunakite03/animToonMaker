import type { Frame, FrameKeypoint } from "@/types/animation"

const KEYPOINT_LABEL_PRESETS = [
  "head",
  "torso",
  "left hand",
  "right hand",
  "left foot",
  "right foot",
  "prop",
  "anchor",
]

const KEYPOINT_COLOR_PRESETS = [
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#14b8a6",
  "#ec4899",
]

const MAX_GUIDANCE_KEYPOINTS = 8

export function getDefaultKeypointLabel(index: number) {
  return KEYPOINT_LABEL_PRESETS[index] ?? `point ${index + 1}`
}

export function getDefaultKeypointColor(index: number) {
  return KEYPOINT_COLOR_PRESETS[index % KEYPOINT_COLOR_PRESETS.length]
}

export function describeKeypointRegion(x: number, y: number) {
  const horizontal = x < 1 / 3 ? "left" : x > 2 / 3 ? "right" : "center"
  const vertical = y < 1 / 3 ? "upper" : y > 2 / 3 ? "lower" : "middle"

  if (horizontal === "center" && vertical === "middle") {
    return "center"
  }

  return `${vertical}-${horizontal}`
}

export function buildFrameMotionGuidance(
  frame: Frame | null,
  previousFrame?: Frame | null
) {
  const currentKeypoints = sanitizeKeypoints(frame?.keypoints)
  if (currentKeypoints.length === 0) {
    return null
  }

  const previousByLabel = new Map(
    sanitizeKeypoints(previousFrame?.keypoints)
      .map((keypoint) => [normalizeLabel(keypoint.label), keypoint] as const)
      .filter(([label]) => Boolean(label))
  )

  let matchedCount = 0
  const lines = currentKeypoints
    .slice(0, MAX_GUIDANCE_KEYPOINTS)
    .map((keypoint, index) => {
      const label = keypoint.label.trim() || getDefaultKeypointLabel(index)
      const previousKeypoint = previousByLabel.get(normalizeLabel(label))
      const targetRegion = describeKeypointRegion(keypoint.x, keypoint.y)

      if (!previousKeypoint) {
        return `${label}: place it near ${targetRegion}.`
      }

      matchedCount += 1
      return `${label}: ${describeMotionDelta(previousKeypoint, keypoint)} so it lands near ${targetRegion}.`
    })

  const intro =
    matchedCount > 0
      ? "Use these motion pins to guide pose and composition. Match the labeled points while following the requested action."
      : "Use these motion pins as anchor positions for pose and composition in this frame."

  return {
    text: [intro, ...lines].join("\n"),
    pinCount: currentKeypoints.length,
    matchedCount,
  }
}

function sanitizeKeypoints(keypoints?: FrameKeypoint[]) {
  return (keypoints ?? []).filter(
    (keypoint) =>
      Number.isFinite(keypoint.x) &&
      Number.isFinite(keypoint.y) &&
      keypoint.x >= 0 &&
      keypoint.x <= 1 &&
      keypoint.y >= 0 &&
      keypoint.y <= 1
  )
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase()
}

function describeMotionDelta(previousKeypoint: FrameKeypoint, keypoint: FrameKeypoint) {
  const dx = keypoint.x - previousKeypoint.x
  const dy = keypoint.y - previousKeypoint.y
  const directions: string[] = []

  if (Math.abs(dx) > 0.03) {
    directions.push(dx > 0 ? "right" : "left")
  }

  if (Math.abs(dy) > 0.03) {
    directions.push(dy > 0 ? "down" : "up")
  }

  if (directions.length === 0) {
    return "keep it almost fixed"
  }

  const distance = Math.hypot(dx, dy)
  const magnitude =
    distance < 0.1 ? "move it slightly" : distance < 0.22 ? "move it" : "move it strongly"

  return `${magnitude} ${directions.join(" and ")}`
}
