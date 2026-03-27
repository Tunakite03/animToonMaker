import { fetch } from "@tauri-apps/plugin-http";
import { STYLE_SUFFIX } from "@/lib/constants";

export interface GenerateFrameParams {
  prompt: string;
  width?: number;
  height?: number;
  provider?: string;
  apiKey?: string;
  model?: string;
}

export interface GenerateFrameResult {
  imageUrl: string;
}

/**
 * Generate a frame image using the configured AI provider.
 * Runs client-side in Tauri — uses Tauri HTTP plugin to bypass CORS.
 */
export async function generateFrame(
  params: GenerateFrameParams,
  signal?: AbortSignal,
): Promise<GenerateFrameResult> {
  const {
    prompt,
    width = 512,
    height = 512,
    provider = "placeholder",
    apiKey,
    model,
  } = params;

  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required");
  }

  const sanitized = prompt.trim().slice(0, 1000);
  const fullPrompt = `${sanitized}${STYLE_SUFFIX}`;

  if (provider === "fal" && apiKey) {
    return await generateWithFal(apiKey, fullPrompt, width, height, signal, model);
  }

  if (provider === "replicate" && apiKey) {
    return await generateWithReplicate(apiKey, fullPrompt, width, height, signal);
  }

  if (provider === "openai" && apiKey) {
    return await generateWithOpenAI(apiKey, fullPrompt, width, height, signal, model);
  }

  if (provider === "stability" && apiKey) {
    return await generateWithStability(apiKey, fullPrompt, width, height, signal, model);
  }

  if (provider === "together" && apiKey) {
    return await generateWithTogether(apiKey, fullPrompt, width, height, signal, model);
  }

  if (provider === "gemini" && apiKey) {
    return await generateWithGemini(apiKey, fullPrompt, width, height, signal, model);
  }

  return generatePlaceholder(sanitized, width, height);
}

// ─── Provider implementations ───────────────────────────────────────────

async function generateWithFal(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
): Promise<GenerateFrameResult> {
  const endpoint = model || "fal-ai/fast-sdxl";
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[fal.ai] Error:", text);
    if (res.status === 401) throw new Error("fal.ai: Invalid API key");
    if (res.status === 402) throw new Error("fal.ai: Payment required — free credits exhausted");
    throw new Error(`fal.ai generation failed: ${res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error("No image returned from AI");

  return { imageUrl };
}

async function generateWithReplicate(
  token: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
): Promise<GenerateFrameResult> {
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
      input: { prompt, width, height },
    }),
    signal,
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    console.error("[replicate] Error:", text);
    if (startRes.status === 401) throw new Error("Replicate: Invalid API token");
    if (startRes.status === 402) throw new Error("Replicate: Payment required — free credits exhausted");
    throw new Error(`Replicate generation failed: ${startRes.status}`);
  }

  const prediction = await startRes.json();
  const imageUrl = prediction.output?.[0] ?? prediction.output;
  if (!imageUrl) throw new Error("No image returned from AI");

  return { imageUrl };
}

async function generateWithOpenAI(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
): Promise<GenerateFrameResult> {
  const size = getOpenAISize(width, height);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "url",
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[openai] Error:", text);
    if (res.status === 401) throw new Error("OpenAI: Invalid API key");
    if (res.status === 429) throw new Error("OpenAI: Rate limit exceeded — try again later");
    throw new Error(`OpenAI generation failed: ${res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error("No image returned from AI");

  return { imageUrl };
}

async function generateWithStability(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
): Promise<GenerateFrameResult> {
  const modelId = model || "sd3.5-large";
  let endpoint: string;

  if (modelId === "stable-image-core") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core";
  } else if (modelId === "stable-image-ultra") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/ultra";
  } else {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
  }

  const aspectRatio = getStabilityAspectRatio(width, height);

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("output_format", "png");
  formData.append("aspect_ratio", aspectRatio);

  if (endpoint.endsWith("/sd3")) {
    formData.append("model", modelId);
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
    },
    body: formData,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[stability] Error:", text);
    if (res.status === 402) throw new Error("Stability AI: Payment required — free credits exhausted");
    if (res.status === 401) throw new Error("Stability AI: Invalid API key");
    throw new Error(`Stability AI generation failed: ${res.status}`);
  }

  const data = await res.json();
  const base64 = data.image;
  if (!base64) throw new Error("No image returned from AI");

  return { imageUrl: `data:image/png;base64,${base64}` };
}

async function generateWithTogether(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  signal?: AbortSignal,
  model?: string,
): Promise<GenerateFrameResult> {
  const togetherModel = model || "black-forest-labs/FLUX.1-schnell";

  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: togetherModel,
      prompt,
      width,
      height,
      n: 1,
      response_format: "url",
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[together] Error:", text);
    if (res.status === 401) throw new Error("Together AI: Invalid API key");
    if (res.status === 402) throw new Error("Together AI: Payment required — free credits exhausted");
    throw new Error(`Together AI generation failed: ${res.status}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error("No image returned from AI");

  return { imageUrl };
}

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  _width: number,
  _height: number,
  signal?: AbortSignal,
  model?: string,
): Promise<GenerateFrameResult> {
  const geminiModel = model || "gemini-2.5-flash-image";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["image", "text"],
        },
      }),
      signal,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[gemini] Error:", text);
    if (res.status === 400) throw new Error("Gemini: Bad request — check your API key and model name");
    if (res.status === 403) throw new Error("Gemini: API key not authorized for image generation");
    if (res.status === 404) throw new Error(`Gemini: Model "${geminiModel}" not found — try gemini-2.5-flash-image instead`);
    if (res.status === 429) throw new Error("Gemini: Rate limit exceeded — wait a moment or switch to gemini-2.5-flash-image");
    throw new Error(`Gemini generation failed: ${res.status}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find(
    (p: { inlineData?: { mimeType: string; data: string } }) =>
      p.inlineData?.mimeType?.startsWith("image/"),
  );

  if (!imagePart?.inlineData) throw new Error("No image returned from AI");

  const { mimeType, data: base64 } = imagePart.inlineData;
  return { imageUrl: `data:${mimeType};base64,${base64}` };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getOpenAISize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.3) return "1792x1024";
  if (ratio < 0.77) return "1024x1792";
  return "1024x1024";
}

function getStabilityAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 2.0) return "21:9";
  if (ratio > 1.6) return "16:9";
  if (ratio > 1.3) return "3:2";
  if (ratio > 1.1) return "5:4";
  if (ratio > 0.9) return "1:1";
  if (ratio > 0.75) return "4:5";
  if (ratio > 0.6) return "2:3";
  if (ratio > 0.45) return "9:16";
  return "9:21";
}

function generatePlaceholder(
  prompt: string,
  width: number,
  height: number,
): GenerateFrameResult {
  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
  ];
  const hash = prompt.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = colors[hash % colors.length];
  const label = prompt.slice(0, 40);

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
  </svg>`;

  const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
  return { imageUrl: dataUrl };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
