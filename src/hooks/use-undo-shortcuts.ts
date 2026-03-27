import { useEffect } from "react";
import { useUndoStore } from "@/store/undo-store";

export function useUndoShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+Z / Cmd+Z → Undo
      // Ctrl+Shift+Z / Cmd+Shift+Z → Redo
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          useUndoStore.getState().redo();
        } else {
          useUndoStore.getState().undo();
        }
        return;
      }

      // Ctrl+Y / Cmd+Y → Redo (alternative)
      if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        useUndoStore.getState().redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
