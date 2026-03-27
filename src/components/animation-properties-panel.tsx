import { useAnimationStore } from "@/store/animation-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AnimationPropertiesPanel() {
  const selectedAnimationId = useAnimationStore(
    (s) => s.project.selectedAnimationId,
  );
  const animations = useAnimationStore((s) => s.project.animations);
  const updateAnimationProperty = useAnimationStore(
    (s) => s.updateAnimationProperty,
  );
  const renameAnimation = useAnimationStore((s) => s.renameAnimation);

  const anim = animations.find((a) => a.id === selectedAnimationId);

  if (!anim) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-xs text-muted-foreground">
          No animation selected
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center border-b border-border/50 bg-muted/30 px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Animation Properties
        </span>
      </div>

      {/* Properties form */}
      <div className="space-y-3 overflow-auto p-3">
        {/* Name */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Name
          </Label>
          <Input
            value={anim.name}
            onChange={(e) => renameAnimation(anim.id, e.target.value)}
            className="h-7 flex-1 text-xs"
          />
        </div>

        {/* Speed */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Speed
          </Label>
          <Input
            type="number"
            min={0}
            max={60}
            value={anim.speed}
            onChange={(e) =>
              updateAnimationProperty(anim.id, {
                speed: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
              })
            }
            className="h-7 w-20 text-xs tabular-nums"
          />
          <span className="text-[10px] text-muted-foreground">
            0 = project default
          </span>
        </div>

        {/* Loop */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Loop
          </Label>
          <Switch
            checked={anim.loop}
            onCheckedChange={(checked) =>
              updateAnimationProperty(anim.id, { loop: checked })
            }
            className="scale-75 origin-left"
          />
        </div>

        {/* Repeat Count */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Repeat Count
          </Label>
          <Input
            type="number"
            min={1}
            max={999}
            value={anim.repeatCount}
            onChange={(e) =>
              updateAnimationProperty(anim.id, {
                repeatCount: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="h-7 w-20 text-xs tabular-nums"
          />
        </div>

        {/* Repeat To */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Repeat To
          </Label>
          <Input
            type="number"
            min={0}
            max={Math.max(0, anim.frames.length - 1)}
            value={anim.repeatTo}
            onChange={(e) =>
              updateAnimationProperty(anim.id, {
                repeatTo: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="h-7 w-20 text-xs tabular-nums"
          />
        </div>

        {/* Ping Pong */}
        <div className="flex items-center gap-3">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Ping Pong
          </Label>
          <Switch
            checked={anim.pingPong}
            onCheckedChange={(checked) =>
              updateAnimationProperty(anim.id, { pingPong: checked })
            }
            className="scale-75 origin-left"
          />
        </div>

        {/* Info */}
        <div className="flex items-center gap-3 pt-1">
          <Label className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
            Frames
          </Label>
          <span className="text-xs tabular-nums text-foreground">
            {anim.frames.length}
          </span>
        </div>
      </div>
    </div>
  );
}
