import { fetch } from "@tauri-apps/plugin-http"
import { STYLE_SUFFIX } from "@/lib/constants"
import { getApiErrorMessage, getErrorMessage } from "@/lib/error-message"

export interface GenerateFrameParams {
  prompt: string
  width?: number
  height?: number
  provider?: string
  apiKey?: string
  model?: string
  styleSuffix?: string
  negativePrompt?: string
  initImage?: string
  strength?: number
  motionGuidance?: string
  /** Prompt of the previous frame in the timeline — used for text-based continuity */
  previousFramePrompt?: string
  /** 0-based index of this frame in the current animation */
  frameIndex?: number
  /** Total number of frames in the current animation */
  totalFrames?: number
  /** Persistent character / scene description injected for visual consistency */
  sceneDescription?: string
  /** Deterministic seed — helps text-only providers maintain consistency */
  seed?: number
}

export interface GenerateFrameResult {
  imageUrl: string
  usedReferenceImage?: boolean
}

export interface FrameGenerationCapabilities {
  supportsReferenceFrame: boolean
}

export function getFrameGenerationCapabilities(
  provider?: string,
  model?: string
): FrameGenerationCapabilities {
  switch (provider) {
    case "gemini":
      return { supportsReferenceFrame: true }
    case "fal":
      // fal SDXL and compatible models support image-to-image natively
      return { supportsReferenceFrame: true }
    case "stability":
      // SD3 endpoint supports image-to-image; core/ultra are text-only
      return {
        supportsReferenceFrame:
          !model ||
          model === "sd3.5-large" ||
          model === "sd3.5-medium" ||
          model === "sd3-large" ||
          model === "sd3-medium" ||
          model.startsWith("sd3"),
      }
    case "replicate":
      // The default SDXL model supports image + prompt_strength
      return { supportsReferenceFrame: true }
    case "openai":
      // Only gpt-image-1 supports image editing via the edits endpoint
      return { supportsReferenceFrame: model === "gpt-image-1" }
    default:
      // together / placeholder — no native img2img support
      return { supportsReferenceFrame: false }
  }
}

/**
 * Generate a frame image using the configured AI provider.
 * Runs client-side in Tauri — uses Tauri HTTP plugin to bypass CORS.
 *
 * When a reference `initImage` is provided and the provider supports it,
 * the provider-specific function performs true image-to-image generation
 * so the output is visually anchored to the previous animation frame.
 */
export async function generateFrame(
  params: GenerateFrameParams,
  signal?: AbortSignal
): Promise<GenerateFrameResult> {
  const {
    prompt,
    width = 512,
    height = 512,
    provider = "placeholder",
    apiKey,
    model,
    styleSuffix,
    negativePrompt,
    initImage,
    strength,
    motionGuidance,
    previousFramePrompt,
    frameIndex,
    totalFrames,
    sceneDescription,
    seed,
  } = params

  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required")
  }

  const sanitizedPrompt = prompt.trim().slice(0, 1000)
  const capabilities = getFrameGenerationCapabilities(provider, model)
  const usedReferenceImage = Boolean(
    initImage && capabilities.supportsReferenceFrame
  )
  const fullPrompt = buildPromptText({
    prompt: sanitizedPrompt,
    styleSuffix,
    negativePrompt,
    motionGuidance,
    strength,
    usesReferenceImage: usedReferenceImage,
    previousFramePrompt,
    frameIndex,
    totalFrames,
    sceneDescription,
  })

  try {
    let result: GenerateFrameResult

    if (provider === "fal" && apiKey) {
      result = await generateWithFal(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        model,
        usedReferenceImage ? initImage : undefined,
        strength
      )
    } else if (provider === "replicate" && apiKey) {
      result = await generateWithReplicate(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        usedReferenceImage ? initImage : undefined,
        strength
      )
    } else if (provider === "openai" && apiKey) {
      result = await generateWithOpenAI(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        model,
        usedReferenceImage ? initImage : undefined,
        strength
      )
    } else if (provider === "stability" && apiKey) {
      result = await generateWithStability(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        model,
        usedReferenceImage ? initImage : undefined,
        strength
      )
    } else if (provider === "together" && apiKey) {
      result = await generateWithTogether(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        model,
        initImage,
        strength,
        seed
      )
    } else if (provider === "gemini" && apiKey) {
      result = await generateWithGemini(
        apiKey,
        fullPrompt,
        width,
        height,
        signal,
        model,
        usedReferenceImage ? initImage : undefined,
        strength
      )
    } else {
      result = generatePlaceholder(sanitizedPrompt, width, height)
    }

    return {
      ...result,
      usedReferenceImage,
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(getErrorMessage(error, "Failed to generate frame"))
  }
}

// ─── Provider Implementations ───────────────────────────────────────────

async function generateWithFal(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
  initImage?: string,
  strength?: number
): Promise<GenerateFrameResult> {
  const endpoint = model || "fal-ai/fast-sdxl"

  const body: Record<string, unknown> = {
    prompt,
    image_size: { width, height },
    num_images: 1,
  }

  // ── img2img: send the previous frame as a reference image ──
  if (initImage) {
    body.image_url = initImage
    body.strength = clampStrength(strength)
  }

  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[fal.ai] Error:", text)
    if (res.status === 401) throw new Error("fal.ai: Invalid API key")
    if (res.status === 402)
      throw new Error("fal.ai: Payment required — free credits exhausted")
    if (res.status === 422)
      throw new Error(
        "fal.ai: This model may not support image-to-image. Try a different model or disable reference frames."
      )
    throw new Error(`fal.ai generation failed: ${res.status}`)
  }

  const data = await res.json()
  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error("No image returned from AI")

  return { imageUrl }
}

async function generateWithReplicate(
  token: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  initImage?: string,
  strength?: number
): Promise<GenerateFrameResult> {
  const input: Record<string, unknown> = { prompt, width, height }

  // ── img2img: pass previous frame as init image to SDXL ──
  if (initImage) {
    input.image = initImage
    input.prompt_strength = clampStrength(strength)
  }

  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version:
        "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input,
    }),
    signal,
  })

  if (!startRes.ok) {
    const text = await startRes.text()
    console.error("[replicate] Error:", text)
    if (startRes.status === 401) throw new Error("Replicate: Invalid API token")
    if (startRes.status === 402)
      throw new Error("Replicate: Payment required — free credits exhausted")
    if (startRes.status === 422)
      throw new Error(
        "Replicate: Model rejected the image input — the selected version may not support img2img"
      )
    throw new Error(`Replicate generation failed: ${startRes.status}`)
  }

  const prediction = await startRes.json()
  const imageUrl = prediction.output?.[0] ?? prediction.output
  if (!imageUrl) throw new Error("No image returned from AI")

  return { imageUrl }
}

async function generateWithOpenAI(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
  initImage?: string,
  _strength?: number
): Promise<GenerateFrameResult> {
  void _strength

  const openaiModel = model || "dall-e-3"

  // ── img2img via the edits endpoint (gpt-image-1 only) ──
  if (initImage && openaiModel === "gpt-image-1") {
    return generateWithOpenAIEdit(
      apiKey,
      prompt,
      width,
      height,
      signal,
      initImage
    )
  }

  // ── Standard text-to-image generation ──
  const size = getOpenAISize(width, height)
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      prompt,
      n: 1,
      size,
      response_format: "url",
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[openai] Error:", text)
    if (res.status === 401) throw new Error("OpenAI: Invalid API key")
    if (res.status === 429)
      throw new Error("OpenAI: Rate limit exceeded — try again later")
    throw new Error(`OpenAI generation failed: ${res.status}`)
  }

  const data = await res.json()
  const image = data.data?.[0]
  const imageUrl =
    (typeof image?.b64_json === "string"
      ? `data:image/png;base64,${image.b64_json}`
      : undefined) || image?.url
  if (!imageUrl) throw new Error("No image returned from AI")

  return { imageUrl }
}

/**
 * OpenAI image-edit flow — sends the reference frame to the
 * `/v1/images/edits` endpoint so gpt-image-1 can use it as a
 * visual anchor for the next animation frame.
 */
async function generateWithOpenAIEdit(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  initImage?: string
): Promise<GenerateFrameResult> {
  const size = getOpenAISize(width, height)

  const formData = new FormData()
  formData.append("model", "gpt-image-1")
  formData.append("prompt", prompt)
  formData.append("n", "1")
  formData.append("size", size)

  if (initImage) {
    const blob = dataUrlToBlob(initImage)
    formData.append("image[]", blob, "reference.png")
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[openai-edit] Error:", text)
    if (res.status === 401) throw new Error("OpenAI: Invalid API key")
    if (res.status === 429)
      throw new Error("OpenAI: Rate limit exceeded — try again later")
    throw new Error(`OpenAI image edit failed: ${res.status}`)
  }

  const data = await res.json()
  const image = data.data?.[0]
  const imageUrl =
    (typeof image?.b64_json === "string"
      ? `data:image/png;base64,${image.b64_json}`
      : undefined) || image?.url
  if (!imageUrl) throw new Error("No image returned from AI")

  return { imageUrl }
}

async function generateWithStability(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
  initImage?: string,
  strength?: number
): Promise<GenerateFrameResult> {
  const modelId = model || "sd3.5-large"
  let endpoint: string

  if (modelId === "stable-image-core") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core"
  } else if (modelId === "stable-image-ultra") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/ultra"
  } else {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/sd3"
  }

  const aspectRatio = getAspectRatio(width, height)
  const formData = new FormData()
  formData.append("prompt", prompt)
  formData.append("output_format", "png")

  // ── img2img: convert the reference frame into a Blob and send it ──
  // Only the SD3 endpoint supports image-to-image mode.
  const useImg2Img = initImage && endpoint.endsWith("/sd3")

  if (useImg2Img) {
    const blob = dataUrlToBlob(initImage)
    formData.append("image", blob, "reference.png")
    formData.append("strength", String(clampStrength(strength)))
    formData.append("mode", "image-to-image")
    // model id is still required for sd3 endpoint
    formData.append("model", modelId)
  } else {
    // text-to-image path — aspect_ratio only applies without init image
    formData.append("aspect_ratio", aspectRatio)
    if (endpoint.endsWith("/sd3")) {
      formData.append("model", modelId)
    }
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
    },
    body: formData,
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[stability] Error:", text)
    if (res.status === 402)
      throw new Error("Stability AI: Payment required — free credits exhausted")
    if (res.status === 401) throw new Error("Stability AI: Invalid API key")
    if (res.status === 422)
      throw new Error(
        "Stability AI: The model rejected the request — the image may be too small or the parameters invalid"
      )
    throw new Error(`Stability AI generation failed: ${res.status}`)
  }

  const data = await res.json()
  const base64 = data.image
  if (!base64) throw new Error("No image returned from AI")

  return { imageUrl: `data:image/png;base64,${base64}` }
}

async function generateWithTogether(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
  _initImage?: string,
  _strength?: number,
  seed?: number
): Promise<GenerateFrameResult> {
  // Together AI image endpoints don't support native img2img yet.
  // Continuity is handled entirely through the enhanced prompt text.
  void _initImage
  void _strength

  const togetherModel = model || "black-forest-labs/FLUX.1-schnell"

  const body: Record<string, unknown> = {
    model: togetherModel,
    prompt,
    width,
    height,
    n: 1,
    response_format: "base64",
  }

  // Use a deterministic seed to improve frame-to-frame consistency
  if (seed !== undefined) {
    body.seed = seed
  }

  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const detail = getApiErrorMessage(text)
    console.error("[together] Error:", text)
    if (res.status === 401) throw new Error("Together AI: Invalid API key")
    if (res.status === 402)
      throw new Error("Together AI: Payment required — free credits exhausted")
    if (res.status === 403)
      throw new Error("Together AI: Access denied for this model or account")
    if (res.status === 404)
      throw new Error(`Together AI: Model "${togetherModel}" not found`)
    if (res.status === 429) {
      throw new Error(
        "Together AI: Rate limit exceeded — try again in a moment"
      )
    }
    if (detail) throw new Error(`Together AI: ${detail}`)
    throw new Error(`Together AI generation failed: ${res.status}`)
  }

  const data = await res.json()
  const image = data.data?.[0]
  const imageUrl =
    (typeof image?.b64_json === "string"
      ? `data:image/png;base64,${image.b64_json}`
      : undefined) || image?.url

  if (!imageUrl) throw new Error("Together AI: No image returned from API")

  return { imageUrl }
}

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
  initImage?: string,
  _strength?: number
): Promise<GenerateFrameResult> {
  void _strength

  const geminiModel = model || "gemini-2.5-flash-image"
  const parts: Array<Record<string, unknown>> = [{ text: prompt }]

  if (initImage) {
    const { mimeType, base64 } = parseDataUrl(initImage)
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64,
      },
    })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: getAspectRatio(width, height),
          },
        },
      }),
      signal,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error("[gemini] Error:", text)
    if (res.status === 400)
      throw new Error("Gemini: Bad request — check your API key and model name")
    if (res.status === 403)
      throw new Error("Gemini: API key not authorized for image generation")
    if (res.status === 404) {
      throw new Error(
        `Gemini: Model "${geminiModel}" not found — try gemini-2.5-flash-image instead`
      )
    }
    if (res.status === 429) {
      throw new Error(
        "Gemini: Rate limit exceeded — wait a moment or switch to gemini-2.5-flash-image"
      )
    }
    throw new Error(`Gemini generation failed: ${res.status}`)
  }

  const data = await res.json()
  const partsResult = data.candidates?.[0]?.content?.parts
  const imagePart = partsResult?.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith("image/")
  )

  if (!imagePart?.inlineData) throw new Error("No image returned from AI")

  const { mimeType, data: base64 } = imagePart.inlineData
  return { imageUrl: `data:${mimeType};base64,${base64}` }
}

// ─── Prompt Construction ────────────────────────────────────────────────

function buildPromptText({
  prompt,
  styleSuffix,
  negativePrompt,
  motionGuidance,
  strength,
  usesReferenceImage,
  previousFramePrompt,
  frameIndex,
  totalFrames,
  sceneDescription,
}: {
  prompt: string
  styleSuffix?: string
  negativePrompt?: string
  motionGuidance?: string
  strength?: number
  usesReferenceImage: boolean
  previousFramePrompt?: string
  frameIndex?: number
  totalFrames?: number
  sceneDescription?: string
}) {
  const sections = [`Frame description:\n${prompt}`]
  const suffix = (styleSuffix ?? STYLE_SUFFIX).trim()
  const negatives = negativePrompt?.trim()
  const motionPlan = motionGuidance?.trim()
  const prevPrompt = previousFramePrompt?.trim()
  const isSequenceFrame =
    frameIndex !== undefined &&
    totalFrames !== undefined &&
    totalFrames > 1 &&
    frameIndex > 0

  // ── Scene/character lock (critical for providers without img2img) ──
  if (sceneDescription?.trim()) {
    sections.push(
      `Character & scene lock (apply to EVERY frame):\n${sceneDescription.trim()}`
    )
  }

  // ── Animation sequence context (helps every provider, even text-only) ──
  if (isSequenceFrame) {
    sections.push(
      `Animation context:\nThis is frame ${frameIndex + 1} of ${totalFrames} in a frame-by-frame animation sequence. Generate the image for this exact frame only.`
    )
  }

  // ── Previous frame description (text-level continuity for all providers) ──
  if (prevPrompt && isSequenceFrame) {
    sections.push(
      `Previous frame description:\n${prevPrompt}\n(Use the above to keep the subject, scene, and art style consistent across frames.)`
    )
  }

  if (suffix) {
    sections.push(`Style lock:\n${suffix}`)
  }

  if (motionPlan) {
    sections.push(`Motion guidance:\n${motionPlan}`)
  }

  // ── Visual-level continuity (only when the provider receives the actual image) ──
  if (usesReferenceImage) {
    sections.push(
      `Continuity instruction:\n${buildContinuityInstruction(strength)}`
    )
  } else if (isSequenceFrame) {
    // Fallback: text-only continuity hint for providers that don't get the image
    sections.push(buildTextOnlyContinuityHint())
  }

  if (negatives) {
    sections.push(
      `Avoid these changes or artifacts:\n${negatives}${isSequenceFrame ? " Do not change the character design, color palette, or art style between frames." : ""}`
    )
  }

  return sections.join("\n\n")
}

/**
 * Build detailed continuity instructions for providers that receive the
 * actual reference image.  The instruction intensity scales with the
 * configured motion-strength value.
 */
function buildContinuityInstruction(strength?: number) {
  const normalized = clampStrength(strength)

  if (normalized <= 0.25) {
    // ── Minimal motion — near-identical frames ──
    return [
      "CRITICAL: The attached/reference image is the PREVIOUS frame in this animation.",
      "You MUST keep the EXACT same character design — same face, proportions, outfit colors, line weight, and shading style.",
      "Keep the EXACT same camera angle, background, and lighting.",
      "Advance the action by only a TINY motion step — a subtle shift in limb position, a slight blink, or a minor expression change.",
      "The output frame must look like it belongs to the same animation cel sequence with minimal frame-to-frame difference.",
      "Do NOT redesign, re-interpret, or re-imagine the character. Copy the visual identity pixel-closely and only animate the described change.",
    ].join(" ")
  }

  if (normalized <= 0.55) {
    // ── Moderate motion — visible but controlled ──
    return [
      "The attached/reference image is the PREVIOUS frame in this animation.",
      "IMPORTANT: Keep the SAME character identity — same face shape, body proportions, hair style, clothing design, and color palette.",
      "Keep the same background scene, camera angle, and overall composition.",
      "Apply a small but clearly visible motion step: the character may shift their pose, move limbs, change facial expression, or take a step.",
      "Think of traditional animation — each frame differs only by the amount needed for smooth, readable motion.",
      "Do NOT change the art style, line quality, color scheme, or character design between frames.",
    ].join(" ")
  }

  // ── High motion — dramatic action permitted ──
  return [
    "The attached/reference image is the PREVIOUS frame in this animation.",
    "Preserve the same character identity: keep recognizable features, outfit, and color scheme.",
    "Maintain the same general art style, background setting, and lighting direction.",
    "A more dramatic change in pose, position, or action is allowed — the character can jump, turn, swing, etc.",
    "Despite the larger motion, the viewer must still immediately recognize this as the same character in the same scene.",
    "Keep line weight, shading technique, and color saturation consistent with the reference frame.",
  ].join(" ")
}

/**
 * Fallback continuity hint injected into the prompt when the provider
 * does NOT support reference images but the frame is part of a sequence.
 * This gives the model at least text-level guidance to stay consistent.
 */
function buildTextOnlyContinuityHint() {
  return [
    "Continuity hint:",
    "This frame is part of an animation sequence.",
    "Maintain EXACT consistency with the previous frame in terms of:",
    "- Character design (face, body, clothing, colors)",
    "- Art style (line weight, shading technique, color palette)",
    "- Scene composition (background, camera angle, lighting)",
    "Only change what the current frame's description explicitly asks for.",
    "The animation should look like it was drawn by the same artist in the same sitting.",
  ].join("\n")
}

// ─── Helpers ────────────────────────────────────────────────────────────

function clampStrength(value?: number) {
  return Math.min(0.95, Math.max(0.05, value ?? 0.4))
}

function parseDataUrl(value: string) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(value)
  if (!match) {
    throw new Error("Reference image must be a base64 data URL")
  }

  return {
    mimeType: match[1],
    base64: match[2],
  }
}

/**
 * Convert a base64 data-URL into a Blob suitable for FormData uploads.
 * Used by Stability AI and OpenAI edit endpoints that require file parts.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const { mimeType, base64 } = parseDataUrl(dataUrl)
  const byteString = atob(base64)
  const buffer = new ArrayBuffer(byteString.length)
  const view = new Uint8Array(buffer)

  for (let i = 0; i < byteString.length; i++) {
    view[i] = byteString.charCodeAt(i)
  }

  return new Blob([buffer], { type: mimeType })
}

function getOpenAISize(width: number, height: number): string {
  const ratio = width / height
  if (ratio > 1.3) return "1792x1024"
  if (ratio < 0.77) return "1024x1792"
  return "1024x1024"
}

function getAspectRatio(width: number, height: number): string {
  const ratio = width / height
  if (ratio > 2.0) return "21:9"
  if (ratio > 1.6) return "16:9"
  if (ratio > 1.3) return "3:2"
  if (ratio > 1.1) return "5:4"
  if (ratio > 0.9) return "1:1"
  if (ratio > 0.75) return "4:5"
  if (ratio > 0.6) return "2:3"
  if (ratio > 0.45) return "9:16"
  return "9:21"
}

function generatePlaceholder(
  prompt: string,
  width: number,
  height: number
): GenerateFrameResult {
  const colors = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
  ]
  const hash = prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = colors[hash % colors.length]
  const label = prompt.slice(0, 40)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bg}" rx="12"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="20" fill="white" opacity="0.9">
      ${escapeXml(label)}
    </text>
    <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle"
          font-family="system-ui,sans-serif" font-size="13" fill="white" opacity="0.6">
      Frame #${(hash % 100) + 1}
    </text>
  </svg>`

  const dataUrl = `data:image/svg+xml;base64,${encodeUtf8ToBase64(svg)}`
  return { imageUrl: dataUrl }
}

function encodeUtf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
