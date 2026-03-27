export default function Loading() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-foreground">Loading…</p>
          <p className="text-xs text-muted-foreground">
            Preparing AnimToon Maker
          </p>
        </div>
      </div>
    </div>
  );
}
