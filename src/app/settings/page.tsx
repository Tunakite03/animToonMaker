"use client";

import { useState } from "react";
import Link from "next/link";
import { useSettingsStore } from "@/store/settings-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const canvasWidth = useSettingsStore((s) => s.canvasWidth);
  const canvasHeight = useSettingsStore((s) => s.canvasHeight);
  const exportFormat = useSettingsStore((s) => s.exportFormat);
  const exportQuality = useSettingsStore((s) => s.exportQuality);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const canvasQuality = useSettingsStore((s) => s.canvasQuality);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  const [showConfirm, setShowConfirm] = useState(false);

  const hasApiKey = apiKey.length > 0;
  const providerName =
    aiProvider === "placeholder"
      ? "None"
      : aiProvider === "fal"
        ? "fal.ai"
        : aiProvider === "replicate"
          ? "Replicate"
          : "OpenAI";

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
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />
          <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/3" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <RocketIcon />
              <h3 className="font-semibold">Get Started with AI Generation</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up an AI provider to start generating animation frames from text prompts.
            </p>
            <div className="mt-4 grid gap-3">
              {[
                { step: "1", text: "Choose an AI provider", sub: "fal.ai recommended for speed" },
                { step: "2", text: "Add your API key", sub: "Stored locally in your browser" },
                { step: "3", text: "Write prompts & generate", sub: "AI creates frames from text" },
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
            <Link href="/settings/ai-provider">
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
        <Link href="/settings/ai-provider" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <AIIcon />
                </div>
                <Badge
                  variant={hasApiKey && aiProvider !== "placeholder" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {hasApiKey && aiProvider !== "placeholder" ? "Active" : "Not set"}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">AI Provider</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">{providerName}</p>
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
        <Link href="/settings/canvas" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CanvasIcon />
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {canvasQuality}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Canvas</p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">
                  {canvasWidth} × {canvasHeight}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">pixels</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Export card */}
        <Link href="/settings/export" className="group">
          <Card className="h-full transition-all hover:border-primary/30 hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ExportIcon />
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {exportQuality}% quality
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Export</p>
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
        <h3 className="text-sm font-medium text-muted-foreground">Quick Access</h3>
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
            <Link key={item.href} href={item.href}>
              <Card className="transition-all hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
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
          <WarningIcon />
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-destructive/10 bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium">Reset all settings</p>
            <p className="text-xs text-muted-foreground">
              Reverts canvas, AI, export, and editor settings to factory defaults.
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
                  resetToDefaults();
                  setShowConfirm(false);
                }}
              >
                Confirm Reset
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Icons ─── */

function AIIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" /><path d="m6.8 15-3.5 2" /><path d="m20.7 17-3.5-2" /><path d="M6.5 8.8 3 6.6" /><path d="m20.7 7-3.5 2" />
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 8 6 4-6 4Z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function EditorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-muted-foreground">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
