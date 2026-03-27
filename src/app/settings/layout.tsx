import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  AIIcon,
  ArrowLeftIcon,
  CanvasIcon,
  EditorIcon,
  ExportIcon,
  SettingsIcon,
  SparkleIcon,
} from "@/assets/icons";

const navItems = [
  { href: "/settings", label: "General", icon: SettingsIcon, description: "Overview & reset" },
  { href: "/settings/ai-provider", label: "AI Provider", icon: AIIcon, description: "API keys & models" },
  { href: "/settings/generation", label: "Generation", icon: SparkleIcon, description: "Style & prompts" },
  { href: "/settings/canvas", label: "Canvas", icon: CanvasIcon, description: "Size & quality" },
  { href: "/settings/editor", label: "Editor", icon: EditorIcon, description: "Timeline & overlays" },
  { href: "/settings/export", label: "Export", icon: ExportIcon, description: "Format & quality" },
];

export default function SettingsLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur-sm">
        <Link
          to="/"
          className="group flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon />
          <span>Back to Editor</span>
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <SettingsIcon className="text-primary" />
          </div>
          <h1 className="text-sm font-semibold">Settings</h1>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar nav */}
        <nav className="w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/30 px-3 py-4">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/settings"
                  ? pathname === "/settings"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                    isActive
                      ? "bg-primary/10 shadow-sm"
                      : "hover:bg-background/80",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground",
                    )}
                  >
                    <item.icon />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm transition-colors",
                        isActive
                          ? "font-semibold text-primary"
                          : "font-medium text-foreground/80 group-hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Sidebar footer */}
          <div className="mt-6 rounded-lg border border-dashed border-border bg-background/60 px-3 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              AnimToon Maker
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
              Settings are saved automatically
            </p>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-2xl px-8 py-8"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
