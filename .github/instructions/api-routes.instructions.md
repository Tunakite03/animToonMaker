---
description: "Use when creating or modifying API route handlers, server-side logic, or AI provider integrations. Covers security, validation, and the AI generation pipeline."
applyTo: "src/app/api/**"
---

# API Route & Server-Side Guidelines

## Route Handler Conventions
- Export async functions named after HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`
- Use `NextRequest`/`NextResponse` from `next/server`
- Always validate and sanitize input — prompts are trimmed and capped at 1000 chars
- Return proper HTTP status codes: 400 for bad input, 500 for server errors
- Never expose raw error stack traces in responses

## AI Provider Security
- **API keys resolve in order**: request body → `.env.local` → placeholder mode
- Never log API keys or include them in error responses
- Never import AI SDKs in client bundles — all AI calls happen server-side only
- Use `STYLE_SUFFIX` from `@/lib/constants` for prompt consistency

## AI Generation Pattern
```ts
// Always follow this pattern:
const sanitized = prompt.trim().slice(0, 1000);
const fullPrompt = `${sanitized}${STYLE_SUFFIX}`;
// Route to provider → return { imageUrl } or placeholder
```

## Error Handling
- Wrap all external API calls in try/catch
- Log errors with context prefix: `[provider-name] Error:`
- Return user-friendly error messages, never raw provider errors
- If no provider key is available, fall back to placeholder mode gracefully

## Rate Limiting Awareness
- Batch generation is sequential — do not parallelize AI calls
- Respect per-provider rate limits (fal.ai, Replicate, OpenAI each differ)
