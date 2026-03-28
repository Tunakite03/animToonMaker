export type ShortcutAction = "saveProject" | "undo" | "redo"

export type ShortcutBindings = Record<ShortcutAction, string>

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = {
  saveProject: "Ctrl+S",
  undo: "Ctrl+Z",
  redo: "Ctrl+Shift+Z",
}

const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt"] as const

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  arrowdown: "Down",
  arrowleft: "Left",
  arrowright: "Right",
  arrowup: "Up",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  down: "Down",
  enter: "Enter",
  esc: "Esc",
  escape: "Esc",
  left: "Left",
  return: "Enter",
  right: "Right",
  space: "Space",
  tab: "Tab",
  up: "Up",
}

function normalizeShortcutToken(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) {
    return null
  }

  const lower = trimmed.toLowerCase()
  if (lower === "ctrl" || lower === "control" || lower === "cmd") {
    return "Ctrl"
  }

  if (lower === "shift") {
    return "Shift"
  }

  if (lower === "alt" || lower === "option") {
    return "Alt"
  }

  if (KEY_ALIASES[lower]) {
    return KEY_ALIASES[lower]
  }

  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }

  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1).toLowerCase()
}

export function normalizeShortcut(shortcut: string): string {
  const tokens = shortcut
    .split("+")
    .map(normalizeShortcutToken)
    .filter((token): token is string => Boolean(token))

  const modifiers = new Set<string>()
  let primaryKey = ""

  for (const token of tokens) {
    if (MODIFIER_ORDER.includes(token as (typeof MODIFIER_ORDER)[number])) {
      modifiers.add(token)
      continue
    }

    primaryKey = token
  }

  if (!primaryKey) {
    return ""
  }

  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), primaryKey].join("+")
}

export function formatShortcutLabel(shortcut: string): string {
  return normalizeShortcut(shortcut) || "Unassigned"
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  const key = normalizeShortcutToken(event.key)
  if (!key || MODIFIER_ORDER.includes(key as (typeof MODIFIER_ORDER)[number])) {
    return null
  }

  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) {
    parts.push("Ctrl")
  }

  if (event.shiftKey) {
    parts.push("Shift")
  }

  if (event.altKey) {
    parts.push("Alt")
  }

  parts.push(key)

  return normalizeShortcut(parts.join("+"))
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const normalized = normalizeShortcut(shortcut)
  if (!normalized) {
    return false
  }

  const parts = normalized.split("+")
  const key = parts.at(-1)
  if (!key) {
    return false
  }

  const requiresCtrl = parts.includes("Ctrl")
  const requiresShift = parts.includes("Shift")
  const requiresAlt = parts.includes("Alt")
  const eventKey = normalizeShortcutToken(event.key)

  return (
    eventKey === key &&
    (event.ctrlKey || event.metaKey) === requiresCtrl &&
    event.shiftKey === requiresShift &&
    event.altKey === requiresAlt
  )
}

export function shouldIgnoreShortcutEvent(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  )
}
