---
description: "Use when writing or modifying React components, Next.js pages, layouts, or any TSX/JSX files. Covers Server/Client boundary, React 19 patterns, and Next.js 16 App Router conventions."
applyTo: "**/*.tsx, **/*.jsx"
---

# Next.js 16 + React 19 Conventions

## Server vs Client Components
- **Default to Server Components** — only add `"use client"` when the component uses hooks, state, event handlers, or browser APIs
- **Never use `next/dynamic` with `{ ssr: false }` inside a Server Component** — move client-only logic into a dedicated `"use client"` component and import it directly
- Do NOT call your own Route Handlers from Server Components (`fetch('/api/...')`); extract shared logic into `lib/` modules instead

## Next.js 16 Specifics
- `params` and `searchParams` in Server Components are **Promises** — always `await` them
- `cookies()`, `headers()`, `draftMode()` are async in App Router — use `await`
- Turbopack is the default dev bundler — do not use `experimental.turbo`
- `serverRuntimeConfig` / `publicRuntimeConfig` are removed — use env variables
- `NEXT_PUBLIC_*` variables are inlined at build time

## React 19 Patterns
- Use `React.use()` for reading promises and context in render
- Prefer `useActionState` over `useFormState` (renamed in React 19)
- `ref` is now a regular prop — no need for `forwardRef` in new components
- Use `<form action={serverAction}>` for progressive enhancement

## Component Guidelines
- One component per file; match filename to export name
- Use TypeScript interfaces for props — never `any`
- Prefer composition over prop drilling — use children/slots patterns
- Place shared components in `src/components/`, route-specific ones inside route folders
- Use `cn()` from `@/lib/utils` for conditional Tailwind classes

## Data Shapes
- Always check `src/types/animation.ts` before creating new interfaces
- Frame type must include: `id`, `prompt`, `imageUrl`, `duration`, `status`
- Store access in render: use selectors (`useStore(s => s.field)`) — never `getState()` in render
