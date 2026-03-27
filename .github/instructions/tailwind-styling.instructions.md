---
description: "Use when writing styles, CSS, or Tailwind classes. Covers Tailwind CSS v4 patterns, shadcn/ui theming, and dark mode."
applyTo: "**/*.css, **/*.tsx"
---

# Tailwind CSS v4 + shadcn/ui Styling

## Tailwind v4 Changes
- No `tailwind.config.js` — configuration is done in CSS with `@theme` directive
- Import via `@import "tailwindcss"` in `globals.css`
- Use CSS custom properties for theming (shadcn pattern)
- `tw-animate-css` provides animation utilities

## Class Conventions
- Use `cn()` from `@/lib/utils` for conditional classes: `cn("base", condition && "variant")`
- Prefer Tailwind utilities over custom CSS — only use `@apply` in `globals.css` for base resets
- Follow shadcn/ui semantic tokens: `bg-background`, `text-foreground`, `border-border`, `bg-card`, `bg-primary`, etc.
- Use `h-svh` instead of `h-screen` for mobile-safe viewport height

## Dark Mode
- Handled via `next-themes` ThemeProvider with class strategy
- All color tokens auto-switch between light/dark — use semantic tokens, not hardcoded colors
- Test both themes when adding new UI

## Responsive Design
- Mobile-first: write base styles for small screens, use `sm:`, `md:`, `lg:` for larger
- The editor layout uses `flex` with `overflow-hidden` for the main shell
- Timeline scrolls horizontally — ensure touch/trackpad scrolling works

## shadcn/ui Components
- Located in `src/components/ui/` — generated via `shadcn` CLI
- Do NOT manually edit shadcn primitives; re-generate or extend via wrapper components
- Use Radix primitives for accessibility (keyboard nav, focus management, ARIA)
