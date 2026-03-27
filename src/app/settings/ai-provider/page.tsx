import { useState } from "react";
import { useSettingsStore, type AIProvider } from "@/store/settings-store";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providers: {
  id: AIProvider;
  name: string;
  description: string;
  docsUrl: string;
  keyPlaceholder: string;
  models: { value: string; label: string }[];
  badge?: string;
  badgeVariant?: "secondary" | "outline" | "default" | "destructive";
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Free tier with generous limits. Use 2.5 Flash for best stability, 3.x models are preview (stricter rate limits).",
    docsUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxx",
    models: [
      { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Stable)" },
      { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image (Preview)" },
      { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (Preview)" },
    ],
    badge: "Free tier",
    badgeVariant: "default",
  },
  {
    id: "fal",
    name: "fal.ai",
    description: "Fast inference API — $10 free credits on signup. Supports SDXL, Flux, and more.",
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
    description: "Run FLUX models at high speed — $5 free credits. OpenAI-compatible API.",
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
    description: "Official Stable Diffusion 3.5 API. Very limited free credits.",
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
    description: "Colored placeholder frames — no API key needed. Great for testing the editor.",
    docsUrl: "",
    keyPlaceholder: "",
    models: [],
    badge: "Free",
    badgeVariant: "outline",
  },
];

export default function AIProviderPage() {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const aiModels = useSettingsStore((s) => s.aiModels);
  const setAIProvider = useSettingsStore((s) => s.setAIProvider);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setAIModel = useSettingsStore((s) => s.setAIModel);

  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const currentProvider = providers.find((p) => p.id === aiProvider) ?? providers[0];
  const needsKey = aiProvider !== "placeholder";

  const handleProviderChange = (value: string) => {
    const newProvider = value as AIProvider;
    setAIProvider(newProvider);
    setShowKey(false);
    setTestStatus("idle");
    setTestMessage("");

    // If the provider has no stored model, set default
    const storedModel = aiModels[newProvider];
    if (!storedModel) {
      const provider = providers.find((p) => p.id === newProvider);
      if (provider && provider.models.length > 0) {
        setAIModel(provider.models[0].value);
      }
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim() || aiProvider === "placeholder") return;
    setTestStatus("testing");
    setTestMessage("");

    try {
      const res = await fetch("/api/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "test connection",
          width: 64,
          height: 64,
          provider: aiProvider,
          apiKey: apiKey,
          model: aiModel || undefined,
        }),
      });

      if (res.ok) {
        setTestStatus("success");
        setTestMessage("Connection successful! AI generation is working.");
      } else {
        const data = await res.json().catch(() => ({}));
        setTestStatus("error");
        setTestMessage(data.error || `Request failed with status ${res.status}`);
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error — check your connection.");
    }
  };

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
                    <Badge variant={provider.badgeVariant ?? "secondary"} className="ml-1 text-[10px] px-1.5 py-0">
                      {provider.badge}
                    </Badge>
                  )}
                  {provider.id !== "placeholder" && apiKeys[provider.id] && (
                    <span className="ml-auto text-green-500" title="API key configured">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
            <p className="mt-0.5 text-xs text-muted-foreground">{currentProvider.description}</p>
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
              Stored locally in your browser — sent only to your server.
            </p>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestStatus("idle");
                }}
                placeholder={currentProvider.keyPlaceholder}
                className="h-10 pr-16 font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 text-xs text-muted-foreground"
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
            Your API key is stored in your browser&apos;s localStorage and is only sent to
            your own Next.js server route (<code className="rounded bg-muted px-1 text-[10px]">/api/generate-frame</code>).
            The key never leaves your machine directly.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Provider Icons ─── */

function ProviderIcon({ id, size = 18 }: { id: AIProvider; size?: number }) {
  switch (id) {
    case "fal":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m13 2 7 9h-7l3 11-7-9h7L13 2z" />
        </svg>
      );
    case "replicate":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="10" x="3" y="11" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" x2="8" y1="16" y2="16" />
          <line x1="16" x2="16" y1="16" y2="16" />
        </svg>
      );
    case "openai":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4" /><path d="m6.8 15-3.5 2" /><path d="m20.7 17-3.5-2" /><path d="M6.5 8.8 3 6.6" /><path d="m20.7 7-3.5 2" />
          <circle cx="12" cy="12" r="6" />
        </svg>
      );
    case "stability":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" /><path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
        </svg>
      );
    case "together":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6V2H8" /><path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
          <path d="M2 12h2" /><path d="M9 11v2" /><path d="M15 11v2" /><path d="M20 12h2" />
        </svg>
      );
    case "gemini":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 0-4 4v2H6a4 4 0 0 0 0 8h2v2a4 4 0 0 0 8 0v-2h2a4 4 0 0 0 0-8h-2V6a4 4 0 0 0-4-4Z" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
  }
}

/* ─── Utility Icons ─── */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" x2="9" y1="9" y2="15" />
      <line x1="9" x2="15" y1="9" y2="15" />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 20 7-13" /><path d="M5 22c-1.7-1-2-3.5-2-5 0-4 3-6 4-8s1-4-1-6" /><path d="M19 22c1.7-1 2-3.5 2-5 0-4-3-6-4-8s-1-4 1-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-muted-foreground">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
