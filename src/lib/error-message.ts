const MESSAGE_FIELDS = [
  "message",
  "error_description",
  "detail",
  "details",
  "reason",
  "title",
  "error",
] as const

function readMessage(
  value: unknown,
  depth: number,
  seen: Set<unknown>
): string | null {
  if (value == null) return null

  if (typeof value === "string") {
    const text = value.trim()
    return text || null
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (value instanceof Error) {
    return value.message?.trim() || value.name?.trim() || null
  }

  if (typeof value !== "object") {
    return null
  }

  if (seen.has(value) || depth > 3) {
    return null
  }

  seen.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = readMessage(item, depth + 1, seen)
      if (message) return message
    }
    return null
  }

  const record = value as Record<string, unknown>
  for (const field of MESSAGE_FIELDS) {
    const message = readMessage(record[field], depth + 1, seen)
    if (message) return message
  }

  if (
    typeof record.status === "number" &&
    typeof record.statusText === "string" &&
    record.statusText.trim()
  ) {
    return `${record.status} ${record.statusText.trim()}`
  }

  try {
    const serialized = JSON.stringify(value)
    if (serialized && serialized !== "{}" && serialized !== "[]") {
      return serialized
    }
  } catch {
    // Ignore non-serializable values.
  }

  return null
}

export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error"
): string {
  return readMessage(error, 0, new Set()) ?? fallback
}

export function getApiErrorMessage(bodyText: string): string | null {
  const normalized = bodyText.trim()
  if (!normalized) return null

  try {
    const parsed = JSON.parse(normalized)
    const message = getErrorMessage(parsed, "")
    if (message) return message
  } catch {
    // Non-JSON response body.
  }

  return normalized.length <= 280
    ? normalized
    : `${normalized.slice(0, 277)}...`
}

export function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError"
  }

  if (error instanceof Error) {
    return (
      error.name === "AbortError" ||
      /aborterror|aborted|operation was aborted/i.test(error.message)
    )
  }

  if (!error || typeof error !== "object") return false
  const record = error as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name : ""
  const code = typeof record.code === "string" ? record.code : ""
  const message = getErrorMessage(error, "")

  return (
    name === "AbortError" ||
    code === "ERR_ABORTED" ||
    /aborterror|aborted|operation was aborted/i.test(message)
  )
}
