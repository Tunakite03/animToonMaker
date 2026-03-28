import { useState } from "react"
import { useSettingsStore, type AIProvider } from "@/store/settings-store"
import { generateFrame } from "@/services/generate-frame"
import { getErrorMessage } from "@/lib/error-message"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckIcon,
  ConnectionIcon,
  ProviderIcon,
  ShieldIcon,
  StatusErrorIcon as ErrorIcon,
} from "@/components/icons"

const providers: {
  id: AIProvider
  name: string
  description: string
  docsUrl: string
  keyPlaceholder: string
  models: { value: string; label: string }[]
  badge?: string
  badgeVariant?: "secondary" | "outline" | "default" | "destructive"
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    description:
      "Free tier with generous limits. Use 2.5 Flash for best stability, 3.x models are preview (stricter rate limits).",
    docsUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      {
        value: "gemini-2.5-flash-image",
        label: "Gemini 2.5 Flash Image (Stable)",
      },
      {
        value: "gemini-3.1-flash-image-preview",
        label: "Gemini 3.1 Flash Image (Preview)",
      },
      {
        value: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image (Preview)",
      },
    ],
    badge: "Free tier",
    badgeVariant: "default",
  },
  {
    id: "fal",
    name: "fal.ai",
    description:
      "Fast inference API — $10 free credits on signup. Supports SDXL, Flux, and more.",
    docsUrl: "https://fal.ai/dashboard/keys",
    keyPlaceholder: "fal_xxxxxxxxxxxxxxxx",
    models: [
      { value: "fal-ai/fast-sdxl", label: "Fast SDXL" },
      { value: "fal-ai/flux/dev", label: "FLUX Dev" },
      { value: "fal-ai/flux/schnell", label: "FLUX Schnell" },
    ],
    badge: "Recommended",
    badgeVariant: "secondary",
  },
  {
    id: "together",
    name: "Together AI",
    description:
      "Run FLUX models at high speed — $5 free credits. OpenAI-compatible API.",
    docsUrl: "https://api.together.ai/settings/api-keys",
    keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell" },
      { value: "black-forest-labs/FLUX.1.1-pro", label: "FLUX.1.1 Pro" },
      { value: "black-forest-labs/FLUX.2-pro", label: "FLUX.2 Pro" },
    ],
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Run open-source models via API. Free credits on signup.",
    docsUrl: "https://replicate.com/account/api-tokens",
    keyPlaceholder: "r8_xxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "stability-ai/sdxl", label: "SDXL" },
      { value: "stability-ai/stable-diffusion", label: "Stable Diffusion" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "DALL·E 3 for high-quality images. Paid API access required.",
    docsUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "dall-e-3", label: "DALL·E 3" },
      { value: "dall-e-2", label: "DALL·E 2" },
    ],
    badge: "Paid",
    badgeVariant: "outline",
  },
  {
    id: "stability",
    name: "Stability AI",
    description:
      "Official Stable Diffusion 3.5 API. Very limited free credits.",
    docsUrl: "https://platform.stability.ai/account/keys",
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "sd3.5-large", label: "SD 3.5 Large" },
      { value: "sd3.5-large-turbo", label: "SD 3.5 Large Turbo" },
      { value: "sd3.5-medium", label: "SD 3.5 Medium" },
      { value: "stable-image-core", label: "Stable Image Core" },
      { value: "stable-image-ultra", label: "Stable Image Ultra" },
    ],
    badge: "Paid",
    badgeVariant: "outline",
  },
  {
    id: "placeholder",
    name: "Placeholder (No AI)",
    description:
      "Colored placeholder frames — no API key needed. Great for testing the editor.",
    docsUrl: "",
    keyPlaceholder: "",
    models: [],
    badge: "Free",
    badgeVariant: "outline",
  },
]

export default function AIProviderPage() {
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const aiModels = useSettingsStore((s) => s.aiModels)
  const setAIProvider = useSettingsStore((s) => s.setAIProvider)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const setAIModel = useSettingsStore((s) => s.setAIModel)

  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle")
  const [testMessage, setTestMessage] = useState("")

  const currentProvider =
    providers.find((p) => p.id === aiProvider) ?? providers[0]
  const needsKey = aiProvider !== "placeholder"
  const isDesktopRuntime =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

  const handleProviderChange = (value: string) => {
    const newProvider = value as AIProvider
    setAIProvider(newProvider)
    setShowKey(false)
    setTestStatus("idle")
    setTestMessage("")

    // If the provider has no stored model, set default
    const storedModel = aiModels[newProvider]
    if (!storedModel) {
      const provider = providers.find((p) => p.id === newProvider)
      if (provider && provider.models.length > 0) {
        setAIModel(provider.models[0].value)
      }
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim() || aiProvider === "placeholder") return
    setTestStatus("testing")
    setTestMessage("")

    try {
      await generateFrame({
        prompt: "test connection",
        width: 64,
        height: 64,
        provider: aiProvider,
        apiKey,
        model: aiModel || undefined,
      })
      setTestStatus("success")
      setTestMessage("Connection successful! AI generation is working.")
    } catch (error) {
      setTestStatus("error")
      setTestMessage(
        getErrorMessage(
          error,
          "Connection failed — check your key and network."
        )
      )
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Provider</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your AI image generation provider and configure your API key.
        </p>
      </div>

      {/* Provider selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Provider</Label>
        <Select value={aiProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <span className="flex items-center gap-2">
                  <ProviderIcon id={provider.id} size={16} />
                  <span>{provider.name}</span>
                  {provider.badge && (
                    <Badge
                      variant={provider.badgeVariant ?? "secondary"}
                      className="ml-1 px-1.5 py-0 text-[10px]"
                    >
                      {provider.badge}
                    </Badge>
                  )}
                  {provider.id !== "placeholder" && apiKeys[provider.id] && (
                    <span
                      className="ml-auto text-green-500"
                      title="API key configured"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Provider info card */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ProviderIcon id={currentProvider.id} size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{currentProvider.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {currentProvider.description}
            </p>
            {currentProvider.docsUrl && (
              <a
                href={currentProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Get your API key &rarr;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* API Key & Model section */}
      {needsKey && (
        <div className="space-y-6 rounded-xl border border-border bg-muted/20 p-5">
          {/* API Key */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">API Key</Label>
            <p className="text-xs text-muted-foreground">
              {isDesktopRuntime
                ? "Stored in desktop appData via Tauri backend."
                : "Stored locally in your browser (localStorage)."}
            </p>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setTestStatus("idle")
                }}
                placeholder={currentProvider.keyPlaceholder}
                className="h-10 pr-16 font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-1.5 h-7 -translate-y-1/2 text-xs text-muted-foreground"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          {/* Model selection */}
          {currentProvider.models.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Model</Label>
              <Select
                value={aiModel || currentProvider.models[0].value}
                onValueChange={(v) => setAIModel(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider.models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Test connection */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!apiKey.trim() || testStatus === "testing"}
              className="gap-1.5"
            >
              {testStatus === "testing" ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Testing...
                </>
              ) : (
                <>
                  <ConnectionIcon />
                  Test Connection
                </>
              )}
            </Button>

            {testStatus === "success" && (
              <div className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckIcon /> {testMessage}
              </div>
            )}
            {testStatus === "error" && (
              <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                <ErrorIcon /> {testMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <ShieldIcon />
        <div>
          <p className="text-xs font-semibold">Security</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {isDesktopRuntime
              ? "API keys are stored by the desktop backend in your appData folder, not in browser localStorage."
              : "API keys are stored in your browser localStorage for web mode."}{" "}
            Keys are only used to call the selected AI provider API.
          </p>
        </div>
      </div>
    </div>
  )
}
