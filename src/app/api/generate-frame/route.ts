import { NextRequest, NextResponse } from "next/server";
import { STYLE_SUFFIX } from "@/lib/constants";

// POST /api/generate-frame
// Body: { prompt, width?, height?, provider?, apiKey?, model? }
// Returns: { imageUrl: string }
//
// Priority for API keys:
// 1. Keys from request body (from settings UI)
// 2. Keys from .env.local (server-side fallback)
// 3. Placeholder mode (no key)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      width = 512,
      height = 512,
      provider,
      apiKey,
      model,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    const sanitized = prompt.trim().slice(0, 1000);
    const fullPrompt = `${sanitized}${STYLE_SUFFIX}`;

    // --- Resolve provider & key (client settings > .env) ---
    const resolvedProvider = provider || detectProviderFromEnv();
    const resolvedKey = apiKey || getEnvKey(resolvedProvider);

    if (resolvedProvider === "fal" && resolvedKey) {
      return await generateWithFal(resolvedKey, fullPrompt, width, height, model);
    }

    if (resolvedProvider === "replicate" && resolvedKey) {
      return await generateWithReplicate(resolvedKey, fullPrompt, width, height);
    }

    if (resolvedProvider === "openai" && resolvedKey) {
      return await generateWithOpenAI(resolvedKey, fullPrompt, width, height, model);
    }

    if (resolvedProvider === "stability" && resolvedKey) {
      return await generateWithStability(resolvedKey, fullPrompt, width, height, model);
    }

    if (resolvedProvider === "together" && resolvedKey) {
      return await generateWithTogether(resolvedKey, fullPrompt, width, height, model);
    }

    if (resolvedProvider === "gemini" && resolvedKey) {
      return await generateWithGemini(resolvedKey, fullPrompt, width, height, model);
    }

    // --- Placeholder mode ---
    return generatePlaceholder(sanitized, width, height);
  } catch (err) {
    console.error("[generate-frame] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function detectProviderFromEnv(): string {
  if (process.env.FAL_KEY) return "fal";
  if (process.env.REPLICATE_API_TOKEN) return "replicate";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.STABILITY_API_KEY) return "stability";
  if (process.env.TOGETHER_API_KEY) return "together";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "placeholder";
}

function getEnvKey(provider: string): string | undefined {
  if (provider === "fal") return process.env.FAL_KEY;
  if (provider === "replicate") return process.env.REPLICATE_API_TOKEN;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  if (provider === "stability") return process.env.STABILITY_API_KEY;
  if (provider === "together") return process.env.TOGETHER_API_KEY;
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  return undefined;
}

async function generateWithFal(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  model?: string,
) {
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
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[fal.ai] Error:", text);
    const msg = res.status === 401
      ? "fal.ai: Invalid API key"
      : res.status === 402
        ? "fal.ai: Payment required — free credits exhausted"
        : `fal.ai generation failed: ${res.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const data = await res.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  return NextResponse.json({ imageUrl });
}

async function generateWithReplicate(
  token: string,
  prompt: string,
  width: number,
  height: number,
) {
  // Start prediction
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
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    console.error("[replicate] Error:", text);
    const msg = startRes.status === 401
      ? "Replicate: Invalid API token"
      : startRes.status === 402
        ? "Replicate: Payment required — free credits exhausted"
        : `Replicate generation failed: ${startRes.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const prediction = await startRes.json();
  const imageUrl = prediction.output?.[0] ?? prediction.output;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  return NextResponse.json({ imageUrl });
}

async function generateWithOpenAI(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  model?: string,
) {
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
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[openai] Error:", text);
    const msg = res.status === 401
      ? "OpenAI: Invalid API key"
      : res.status === 429
        ? "OpenAI: Rate limit exceeded — try again later"
        : `OpenAI generation failed: ${res.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  return NextResponse.json({ imageUrl });
}

async function generateWithStability(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  model?: string,
) {
  // Determine endpoint based on model selection
  const modelId = model || "sd3.5-large";
  let endpoint: string;

  if (modelId === "stable-image-core") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core";
  } else if (modelId === "stable-image-ultra") {
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/ultra";
  } else {
    // sd3.5-large, sd3.5-large-turbo, sd3.5-medium
    endpoint = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
  }

  const aspectRatio = getStabilityAspectRatio(width, height);

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("output_format", "png");
  formData.append("aspect_ratio", aspectRatio);

  // SD3 endpoint supports the model parameter
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
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[stability] Error:", text);
    const msg = res.status === 402
      ? "Stability AI: Payment required — free credits exhausted. Add billing at platform.stability.ai"
      : res.status === 401
        ? "Stability AI: Invalid API key"
        : `Stability AI generation failed: ${res.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const data = await res.json();
  const base64 = data.image;
  if (!base64) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  const imageUrl = `data:image/png;base64,${base64}`;
  return NextResponse.json({ imageUrl });
}

function getStabilityAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  // Map to supported aspect ratios: 16:9, 1:1, 21:9, 2:3, 3:2, 4:5, 5:4, 9:16, 9:21
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

async function generateWithTogether(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
  model?: string,
) {
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
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[together] Error:", text);
    const msg = res.status === 401
      ? "Together AI: Invalid API key"
      : res.status === 402
        ? "Together AI: Payment required — free credits exhausted"
        : `Together AI generation failed: ${res.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  return NextResponse.json({ imageUrl });
}

async function generateWithGemini(
  apiKey: string,
  prompt: string,
  _width: number,
  _height: number,
  model?: string,
) {
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
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("[gemini] Error:", text);
    const msg = res.status === 400
      ? "Gemini: Bad request — check your API key and model name"
      : res.status === 403
        ? "Gemini: API key not authorized for image generation"
        : res.status === 404
          ? `Gemini: Model "${geminiModel}" not found — try gemini-2.5-flash-image instead`
          : res.status === 429
            ? "Gemini: Rate limit exceeded — wait a moment or switch to gemini-2.5-flash-image"
            : `Gemini generation failed: ${res.status}`;
    return NextResponse.json(
      { error: msg },
      { status: 502 },
    );
  }

  const data = await res.json();
  // Find the image part in the response
  const parts = data.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith("image/"),
  );

  if (!imagePart?.inlineData) {
    return NextResponse.json(
      { error: "No image returned from AI" },
      { status: 502 },
    );
  }

  const { mimeType, data: base64 } = imagePart.inlineData;
  const imageUrl = `data:${mimeType};base64,${base64}`;
  return NextResponse.json({ imageUrl });
}

function getOpenAISize(width: number, height: number): string {
  // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
  const ratio = width / height;
  if (ratio > 1.3) return "1792x1024";
  if (ratio < 0.77) return "1024x1792";
  return "1024x1024";
}

function generatePlaceholder(prompt: string, width: number, height: number) {
  // Return a placeholder SVG as a data URL
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

  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return NextResponse.json({ imageUrl: dataUrl });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
