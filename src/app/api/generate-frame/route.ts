import { NextRequest, NextResponse } from "next/server";
import { STYLE_SUFFIX } from "@/lib/constants";

// POST /api/generate-frame
// Body: { prompt: string, width?: number, height?: number }
// Returns: { imageUrl: string }
//
// This route supports two modes:
// 1. Real AI generation (set FAL_KEY or REPLICATE_API_TOKEN in .env.local)
// 2. Placeholder mode (no API key) — returns a generated placeholder image

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, width = 512, height = 512 } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    const sanitized = prompt.trim().slice(0, 1000);
    const fullPrompt = `${sanitized}${STYLE_SUFFIX}`;

    // --- Try fal.ai ---
    const falKey = process.env.FAL_KEY;
    if (falKey) {
      return await generateWithFal(falKey, fullPrompt, width, height);
    }

    // --- Try Replicate ---
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      return await generateWithReplicate(replicateToken, fullPrompt, width, height);
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

async function generateWithFal(
  apiKey: string,
  prompt: string,
  width: number,
  height: number,
) {
  const res = await fetch("https://fal.run/fal-ai/fast-sdxl", {
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
    return NextResponse.json(
      { error: `AI generation failed: ${res.status}` },
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
    return NextResponse.json(
      { error: `AI generation failed: ${startRes.status}` },
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
