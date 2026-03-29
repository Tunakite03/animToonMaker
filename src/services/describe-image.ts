import { fetch } from "@tauri-apps/plugin-http"
import { getErrorMessage } from "@/lib/error-message"

export interface DescribeImageParams {
  imageDataUrl: string
  provider: string
  apiKey: string
  model?: string
}

export interface DescribeImageResult {
  description: string
}

export const AUTO_DESCRIBE_BASE_PROMPT = `You are analyzing a single animation frame. Describe the character(s) and scene in precise detail so an AI image generator can recreate this exact look consistently across many animation frames.

Include ALL of the following:
- Character: body type & proportions (e.g. chibi, realistic), head size ratio, face shape & features, hair style & color, skin tone, clothing details with exact colors, footwear, accessories, weapon/props
- Art style: pixel art / chibi / cartoon / anime / flat-color / realistic, line weight (thick/thin/clean), shading style (flat/cel/gradient), level of detail
- Color palette: list the dominant colors using specific names (e.g. "olive green", "dark charcoal", "pastel pink")
- Background & scene: elements, colors, lighting direction, ground/floor details
- Pose & composition: facing direction, body orientation, framing

Write a dense, factual "character reference sheet" paragraph. Use concrete, specific color and shape terms. Do NOT use vague words like "nice" or "cool". Do NOT include narrative or story context. Keep the output under 800 characters.`

const VISION_CAPABLE_PROVIDERS = ["gemini", "openai"] as const

export function getVisionCapableProviders(): readonly string[] {
  return VISION_CAPABLE_PROVIDERS
}

export function isVisionCapableProvider(provider: string): boolean {
  return VISION_CAPABLE_PROVIDERS.includes(
    provider as (typeof VISION_CAPABLE_PROVIDERS)[number]
  )
}

/**
 * Send a frame image to a vision-capable AI and receive a text description.
 *
 * The description is designed to be pasted into the Scene & Character Lock
 * field so that subsequent frame generations stay visually consistent.
 */
export async function describeImage(
  params: DescribeImageParams,
  signal?: AbortSignal
): Promise<DescribeImageResult> {
  const { imageDataUrl, provider, apiKey, model } = params

  if (!imageDataUrl) {
    throw new Error("No image provided")
  }
  if (!apiKey) {
    throw new Error("An API key is required for image description")
  }

  switch (provider) {
    case "gemini":
      return describeWithGemini(apiKey, imageDataUrl, signal, model)
    case "openai":
      return describeWithOpenAI(apiKey, imageDataUrl, signal, model)
    default:
      throw new Error(
        `${provider} does not support image analysis. Please configure a Gemini or OpenAI API key.`
      )
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseDataUrl(value: string) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(value)
  if (!match) {
    throw new Error("Image must be a base64 data URL")
  }
  return { mimeType: match[1], base64: match[2] }
}

// ─── Gemini Vision ──────────────────────────────────────────────────────

async function describeWithGemini(
  apiKey: string,
  imageDataUrl: string,
  signal?: AbortSignal,
  model?: string
): Promise<DescribeImageResult> {
  // Use a text-only model for vision analysis (not an image-generation model)
  const geminiModel = model ?? "gemini-2.5-flash"

  const { mimeType, base64 } = parseDataUrl(imageDataUrl)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: AUTO_DESCRIBE_BASE_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT"],
          maxOutputTokens: 1024,
        },
      }),
      signal,
    }
  )

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.error("[gemini-vision] Error:", body)
    if (res.status === 400)
      throw new Error(
        "Gemini: Bad request — the image may be too large or the model does not support vision"
      )
    if (res.status === 403)
      throw new Error("Gemini: API key not authorized for this model")
    if (res.status === 429)
      throw new Error("Gemini: Rate limit exceeded — wait a moment and retry")
    throw new Error(`Gemini vision request failed: ${res.status}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts)
    ? parts
        .filter(
          (p: { text?: string }) => typeof p.text === "string" && p.text.trim()
        )
        .map((p: { text: string }) => p.text)
        .join("")
    : undefined

  if (!text) {
    throw new Error(
      "Gemini returned an empty response — try again or use a different model"
    )
  }

  return { description: text.trim() }
}

// ─── OpenAI Vision ──────────────────────────────────────────────────────

async function describeWithOpenAI(
  apiKey: string,
  imageDataUrl: string,
  signal?: AbortSignal,
  model?: string
): Promise<DescribeImageResult> {
  const openaiModel = model ?? "gpt-4o-mini"

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: AUTO_DESCRIBE_BASE_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
    signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    console.error("[openai-vision] Error:", body)
    if (res.status === 401) throw new Error("OpenAI: Invalid API key")
    if (res.status === 429)
      throw new Error("OpenAI: Rate limit exceeded — wait a moment and retry")
    if (res.status === 404)
      throw new Error(
        `OpenAI: Model "${openaiModel}" not found — try gpt-4o-mini or gpt-4o`
      )
    throw new Error(
      `OpenAI vision request failed: ${res.status} — ${getErrorMessage(body, "unknown error")}`
    )
  }

  const data = await res.json()
  const text: string | undefined = data.choices?.[0]?.message?.content

  if (!text) {
    throw new Error(
      "OpenAI returned an empty response — try again or use a different model"
    )
  }

  return { description: text.trim() }
}
