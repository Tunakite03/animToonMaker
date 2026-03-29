import { useEffect, useEffectEvent } from "react"
import { MAX_FRAMES } from "@/lib/constants"
import { matchesShortcut, shouldIgnoreShortcutEvent } from "@/lib/shortcuts"
import { useAnimationStore } from "@/store/animation-store"
import { useSettingsStore } from "@/store/settings-store"
import { useUndoStore } from "@/store/undo-store"

interface UseEditorShortcutsOptions {
  onSaveProject: () => void
}

export function useEditorShortcuts({
  onSaveProject,
}: UseEditorShortcutsOptions) {
  const shortcutBindings = useSettingsStore((s) => s.shortcutBindings)

  const moveFrameSelection = (direction: "left" | "right") => {
    const { project, getCurrentFrames, selectFrame } =
      useAnimationStore.getState()
    const frames = getCurrentFrames()

    if (frames.length === 0) {
      return
    }

    const currentIndex = project.selectedFrameId
      ? frames.findIndex((frame) => frame.id === project.selectedFrameId)
      : -1

    if (currentIndex === -1) {
      selectFrame(
        direction === "left" ? (frames.at(-1)?.id ?? null) : frames[0].id
      )
      return
    }

    const targetIndex =
      direction === "left"
        ? Math.max(0, currentIndex - 1)
        : Math.min(frames.length - 1, currentIndex + 1)

    if (targetIndex !== currentIndex) {
      selectFrame(frames[targetIndex]?.id ?? null)
    }
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (shouldIgnoreShortcutEvent(event)) {
      return
    }

    if (!event.repeat && matchesShortcut(event, shortcutBindings.saveProject)) {
      event.preventDefault()
      onSaveProject()
      return
    }

    if (!event.repeat && matchesShortcut(event, shortcutBindings.undo)) {
      event.preventDefault()
      useUndoStore.getState().undo()
      return
    }

    if (!event.repeat && matchesShortcut(event, shortcutBindings.redo)) {
      event.preventDefault()
      useUndoStore.getState().redo()
      return
    }

    if (!event.repeat && matchesShortcut(event, "Ctrl+C")) {
      const { project, copyFrame } = useAnimationStore.getState()
      if (!project.selectedFrameId) {
        return
      }

      event.preventDefault()
      copyFrame(project.selectedFrameId)
      return
    }

    if (!event.repeat && matchesShortcut(event, "Ctrl+X")) {
      const { project, cutFrame } = useAnimationStore.getState()
      if (!project.selectedFrameId) {
        return
      }

      event.preventDefault()
      cutFrame(project.selectedFrameId)
      return
    }

    if (!event.repeat && matchesShortcut(event, "Ctrl+V")) {
      const { project, getCurrentFrames, pasteFrame, frameClipboard } =
        useAnimationStore.getState()
      if (!frameClipboard) {
        return
      }

      if (getCurrentFrames().length >= MAX_FRAMES) {
        return
      }

      event.preventDefault()
      pasteFrame(project.selectedFrameId, "after")
      return
    }

    if (
      !event.repeat &&
      event.key === "Delete" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      const { project, removeFrame } = useAnimationStore.getState()
      if (!project.selectedFrameId) {
        return
      }

      event.preventDefault()
      removeFrame(project.selectedFrameId)
      return
    }

    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      moveFrameSelection("left")
      return
    }

    if (event.key === "ArrowRight") {
      event.preventDefault()
      moveFrameSelection("right")
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
