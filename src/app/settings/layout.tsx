import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

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

/* ─── Icons ─── */

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CanvasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 8 6 4-6 4Z" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" /><path d="m6.8 15-3.5 2" /><path d="m20.7 17-3.5-2" /><path d="M6.5 8.8 3 6.6" /><path d="m20.7 7-3.5 2" />
      <circle cx="12" cy="12" r="6" />
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

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
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
