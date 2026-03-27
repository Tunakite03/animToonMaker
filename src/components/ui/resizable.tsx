import { Group, Panel, Separator } from "react-resizable-panels"
import { GripIcon } from "@/components/icons"
import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return <Group className={cn("flex h-full w-full", className)} {...props} />
}

const ResizablePanel = Panel

function ResizableHandle({
  withHandle,
  orientation = "horizontal",
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
  orientation?: "horizontal" | "vertical"
}) {
  const isVertical = orientation === "vertical"

  return (
    <Separator
      className={cn(
        "relative flex items-center justify-center bg-border focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
        isVertical
          ? "h-px w-full after:absolute after:inset-x-0 after:top-1/2 after:h-1 after:-translate-y-1/2"
          : "w-px after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border bg-border",
            isVertical ? "h-3 w-8" : "h-8 w-3"
          )}
        >
          <GripIcon className={isVertical ? "rotate-90" : ""} />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
