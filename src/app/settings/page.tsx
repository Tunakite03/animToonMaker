import { useState } from "react"
import { Link } from "react-router-dom"
import { useSettingsStore } from "@/store/settings-store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AIIcon,
  CanvasIcon,
  EditorIcon,
  ExportIcon,
  SparkleIcon,
} from "@/assets/icons"
import { ArrowRightIcon, FileWarningIcon, RocketIcon } from "lucide-react"

export default function SettingsPage() {
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const canvasWidth = useSettingsStore((s) => s.canvasWidth)
  const canvasHeight = useSettingsStore((s) => s.canvasHeight)
  const exportFormat = useSettingsStore((s) => s.exportFormat)
  const exportQuality = useSettingsStore((s) => s.exportQuality)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const canvasQuality = useSettingsStore((s) => s.canvasQuality)
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults)

  const [showConfirm, setShowConfirm] = useState(false)

  const hasApiKey = apiKey.length > 0
  const providerName =
    aiProvider === "placeholder"
      ? "None"
      : aiProvider === "fal"
        ? "fal.ai"
        : aiProvider === "replicate"
          ? "Replicate"
          : "OpenAI"

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">General</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your AnimToon Maker configuration.
        </p>
      </div>

      {/* Quick start guide */}
      {!hasApiKey && aiProvider === "placeholder" && (
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/5" />
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-primary/3" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <RocketIcon />
              <h3 className="font-semibold">Get Started with AI Generation</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up an AI provider to start generating animation frames from
              text prompts.
            </p>
            <div className="mt-4 grid gap-3">
              {[
                {
                  step: "1",
                  text: "Choose an AI provider",
                  sub: "fal.ai recommended for speed",
                },
                {
                  step: "2",
                  text: "Add your API key",
                  sub: "Stored locally in your browser",
                },
                {
                  step: "3",
                  text: "Write prompts & generate",
                  sub: "AI creates frames from text",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/settings/ai-provider">
              <Button size="sm" className="mt-4">
                Configure AI Provider
                <ArrowRightIcon />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Status cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* AI Provider card */}
        <Link to="/settings/ai-provider" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <AIIcon size={18} />
                </div>
                <Badge
                  variant={
                    hasApiKey && aiProvider !== "placeholder"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {hasApiKey && aiProvider !== "placeholder"
                    ? "Active"
                    : "Not set"}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  AI Provider
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">
                  {providerName}
                </p>
                {aiModel && aiProvider !== "placeholder" && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {aiModel.split("/").pop()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Canvas card */}
        <Link to="/settings/canvas" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CanvasIcon size={18} />
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {canvasQuality}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Canvas
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">
                  {canvasWidth} × {canvasHeight}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">pixels</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Export card */}
        <Link to="/settings/export" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ExportIcon size={18} />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {exportQuality}% quality
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Export
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight uppercase">
                  {exportFormat}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">format</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Quick Access
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              href: "/settings/generation",
              icon: <SparkleIcon />,
              label: "Generation",
              desc: "Style suffix & negative prompts",
            },
            {
              href: "/settings/editor",
              icon: <EditorIcon />,
              label: "Editor",
              desc: "Onion skin & timeline",
            },
          ].map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="transition-all hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                  <ArrowRightIcon />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="space-y-3 rounded-xl border border-destructive/15 bg-destructive/[0.02] p-4">
        <div className="flex items-center gap-2">
          <FileWarningIcon />
          <h3 className="text-sm font-semibold text-destructive">
            Danger Zone
          </h3>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/10 bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">Reset all settings</p>
            <p className="text-xs text-muted-foreground">
              Reverts canvas, AI, export, and editor settings to factory
              defaults.
            </p>
          </div>
          {!showConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              Reset
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  resetToDefaults()
                  setShowConfirm(false)
                }}
              >
                Confirm Reset
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
