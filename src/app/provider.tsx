import { useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { useSettingsStore } from "@/store/settings-store"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useSettingsStore.getState().hydrateApiKeys()
  }, [])

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </ThemeProvider>
  )
}
