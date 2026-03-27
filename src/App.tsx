import { Suspense, lazy, type ReactNode } from "react"
import { Route, Routes } from "react-router-dom"
import { EditorLayout } from "@/components/editor-layout"
import { Providers } from "./provider/provider"

const SettingsLayout = lazy(() => import("@/app/settings/layout"))
const SettingsPage = lazy(() => import("@/app/settings/page"))
const AIProviderPage = lazy(() => import("@/app/settings/ai-provider/page"))
const CanvasPage = lazy(() => import("@/app/settings/canvas/page"))
const EditorSettingsPage = lazy(() => import("@/app/settings/editor/page"))
const ExportPage = lazy(() => import("@/app/settings/export/page"))
const GenerationPage = lazy(() => import("@/app/settings/generation/page"))

function SettingsFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="rounded-lg border border-border/60 bg-card px-8 py-6 text-sm text-muted-foreground shadow-lg">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-muted-foreground/20"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-foreground border-r-foreground"></div>
          </div>
          <p className="text-center font-medium">Loading settings...</p>
        </div>
      </div>
    </div>
  )
}

function withSettingsSuspense(children: ReactNode) {
  return <Suspense fallback={<SettingsFallback />}>{children}</Suspense>
}

export function App() {
  return (
    <Providers>
      <div className="font-sans antialiased">
        <Routes>
          <Route path="/" element={<EditorLayout />} />
          <Route
            path="/settings"
            element={withSettingsSuspense(<SettingsLayout />)}
          >
            <Route index element={withSettingsSuspense(<SettingsPage />)} />
            <Route
              path="ai-provider"
              element={withSettingsSuspense(<AIProviderPage />)}
            />
            <Route
              path="canvas"
              element={withSettingsSuspense(<CanvasPage />)}
            />
            <Route
              path="editor"
              element={withSettingsSuspense(<EditorSettingsPage />)}
            />
            <Route
              path="export"
              element={withSettingsSuspense(<ExportPage />)}
            />
            <Route
              path="generation"
              element={withSettingsSuspense(<GenerationPage />)}
            />
          </Route>
        </Routes>
      </div>
    </Providers>
  )
}
