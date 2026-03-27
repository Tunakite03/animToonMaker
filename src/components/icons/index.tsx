import type { ComponentPropsWithoutRef, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  CircleOff,
  CircleX,
  ClipboardPaste,
  Clapperboard,
  Copy,
  CopyPlus,
  Download,
  File,
  Flame,
  Folder,
  FolderPlus,
  Grip,
  ImageOff,
  Info,
  Layers3,
  LayoutGrid,
  Lightbulb,
  Link2,
  LoaderCircle,
  Monitor,
  Moon,
  Palette,
  Pencil,
  PencilLine,
  Play,
  Plus,
  Redo2,
  Rocket,
  Save,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  SquarePlus,
  Sun,
  SunMedium,
  Trash2,
  TriangleAlert,
  Undo2,
  Video,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AIProvider } from "@/store/settings-store"

export type IconProps = Omit<
  ComponentPropsWithoutRef<"svg">,
  "width" | "height"
> & {
  size?: number
}

type CustomIconOptions = {
  className?: string
  size: number
  strokeWidth?: number | string
  viewBox?: string
}

type ProviderIconProps = Omit<IconProps, "id"> & {
  id: AIProvider
}

function createLucideIcon(
  IconComponent: LucideIcon,
  defaultSize: number,
  defaultStrokeWidth = 2,
  defaultClassName?: string
) {
  return function LucideAppIcon({
    size,
    className,
    strokeWidth,
    ...props
  }: IconProps) {
    return (
      <IconComponent
        size={size ?? defaultSize}
        strokeWidth={strokeWidth ?? defaultStrokeWidth}
        className={cn(defaultClassName, className)}
        {...props}
      />
    )
  }
}

function renderCustomIcon(
  {
    size,
    className,
    strokeWidth,
    children,
    ...props
  }: IconProps & { children: ReactNode },
  defaults: CustomIconOptions
) {
  return (
    <svg
      width={size ?? defaults.size}
      height={size ?? defaults.size}
      viewBox={defaults.viewBox ?? "0 0 24 24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? defaults.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(defaults.className, className)}
      {...props}
    >
      {children}
    </svg>
  )
}

function FilmStripBase(props: Omit<IconProps, "children">) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 3v18" />
          <path d="M3 7.5h4" />
          <path d="M3 12h18" />
          <path d="M3 16.5h4" />
          <path d="M17 3v18" />
          <path d="M17 7.5h4" />
          <path d="M17 16.5h4" />
        </>
      ),
    },
    { size: 28, strokeWidth: 1.5 }
  )
}

function FrameGridBase(props: Omit<IconProps, "children">) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </>
      ),
    },
    { size: 20, strokeWidth: 1.5 }
  )
}

export const ArrowLeftIcon = createLucideIcon(ArrowLeft, 16)
export const ArrowRightIcon = createLucideIcon(
  ChevronRight,
  14,
  2,
  "ml-auto shrink-0 text-muted-foreground"
)
export const CheckIcon = createLucideIcon(Check, 14, 2.5, "shrink-0")
export const StatusErrorIcon = createLucideIcon(CircleX, 14, 2.5, "shrink-0")
export const ConnectionIcon = createLucideIcon(Flame, 14)
export const ShieldIcon = createLucideIcon(
  ShieldCheck,
  16,
  2,
  "mt-0.5 shrink-0 text-muted-foreground"
)
export const LinkIcon = createLucideIcon(Link2, 14, 2, "text-muted-foreground")
export const InfoIcon = createLucideIcon(
  Info,
  16,
  2,
  "shrink-0 text-muted-foreground"
)
export const PaletteIcon = createLucideIcon(Palette, 18)
export const BlockIcon = createLucideIcon(CircleOff, 18)
export const AutoIcon = createLucideIcon(SunMedium, 18)
export const TipIcon = createLucideIcon(Lightbulb, 12, 2, "mt-px shrink-0")
export const RocketIcon = createLucideIcon(Rocket, 20)
export const WarningIcon = createLucideIcon(
  TriangleAlert,
  16,
  2,
  "text-destructive"
)
export const EmptyCanvasIcon = createLucideIcon(
  ImageOff,
  40,
  1.5,
  "text-muted-foreground/30"
)
export const AddFramesIcon = createLucideIcon(
  FolderPlus,
  14,
  1.8,
  "text-primary"
)
export const PlusSmIcon = createLucideIcon(Plus, 11, 2.5)
export const PlusIcon = createLucideIcon(Plus, 12, 2.5)
export const DuplicateIcon = createLucideIcon(Copy, 12)
export const CopyFrameIcon = createLucideIcon(CopyPlus, 14, 1.8, "text-primary")
export const CutFrameIcon = createLucideIcon(Scissors, 14, 1.8, "text-primary")
export const PasteFrameIcon = createLucideIcon(
  ClipboardPaste,
  14,
  1.8,
  "text-primary"
)
export const TrashFrameIcon = createLucideIcon(Trash2, 14, 1.8)
export const CloseMenuIcon = createLucideIcon(X, 10, 2.4)
export const RenameIcon = createLucideIcon(Pencil, 12)
export const SaveIcon = createLucideIcon(Save, 14)
export const ExportIcon = createLucideIcon(Download, 16)
export const VideoIcon = createLucideIcon(Video, 15)
export const SpinnerIcon = createLucideIcon(LoaderCircle, 13, 2, "animate-spin")
export const SparkleIcon = createLucideIcon(Sparkles, 16)
export const SparklesIcon = createLucideIcon(Sparkles, 13)
export const XIcon = createLucideIcon(X, 13, 2.5)
export const CopyIcon = createLucideIcon(Copy, 12)
export const TrashIcon = createLucideIcon(Trash2, 13)
export const PenLineIcon = createLucideIcon(PencilLine, 11)
export const LayersIcon = createLucideIcon(Layers3, 10)
export const AlertIcon = createLucideIcon(CircleAlert, 12)
export const PlayAllIcon = createLucideIcon(Play, 12)
export const ErrorCircleIcon = createLucideIcon(
  CircleAlert,
  18,
  2,
  "text-destructive/60"
)
export const FolderIcon = createLucideIcon(Folder, 16)
export const EmptyIcon = createLucideIcon(LayoutGrid, 40, 1.5, "opacity-40")
export const FilmIcon = createLucideIcon(Clapperboard, 18, 1.8)
export const LoadIcon = createLucideIcon(File, 14)
export const SettingsIcon = createLucideIcon(Settings, 16)
export const SunIcon = createLucideIcon(Sun, 16)
export const MoonIcon = createLucideIcon(Moon, 16)
export const SystemIcon = createLucideIcon(Monitor, 16)
export const PlusFrameIcon = createLucideIcon(SquarePlus, 12)
export const ImportIcon = createLucideIcon(Download, 12)
export const UndoIcon = createLucideIcon(Undo2, 12)
export const RedoIcon = createLucideIcon(Redo2, 12)
export const GripIcon = createLucideIcon(Grip, 10, 2, "h-2.5 w-2.5")

export function CanvasIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 8 6 4-6 4Z" />
        </>
      ),
    },
    { size: 16 }
  )
}

export function AIIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <path d="M12 2v4" />
          <path d="m6.8 15-3.5 2" />
          <path d="m20.7 17-3.5-2" />
          <path d="M6.5 8.8 3 6.6" />
          <path d="m20.7 7-3.5 2" />
          <circle cx="12" cy="12" r="6" />
        </>
      ),
    },
    { size: 16 }
  )
}

export function EditorIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
        </>
      ),
    },
    { size: 16 }
  )
}

export function ProviderIcon({
  id,
  size = 18,
  className,
  strokeWidth,
  ...props
}: ProviderIconProps) {
  const sharedProps = {
    size,
    className,
    strokeWidth,
    ...props,
  }

  switch (id) {
    case "fal":
      return renderCustomIcon(
        {
          ...sharedProps,
          children: <path d="m13 2 7 9h-7l3 11-7-9h7L13 2z" />,
        },
        { size: 18 }
      )
    case "replicate":
      return renderCustomIcon(
        {
          ...sharedProps,
          children: (
            <>
              <rect width="18" height="10" x="3" y="11" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" x2="8" y1="16" y2="16" />
              <line x1="16" x2="16" y1="16" y2="16" />
            </>
          ),
        },
        { size: 18 }
      )
    case "openai":
      return <AIIcon {...sharedProps} />
    case "stability":
      return renderCustomIcon(
        {
          ...sharedProps,
          children: (
            <>
              <path d="M6 18h8" />
              <path d="M3 22h18" />
              <path d="M14 22a7 7 0 1 0 0-14h-1" />
              <path d="M9 14h2" />
              <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
            </>
          ),
        },
        { size: 18 }
      )
    case "together":
      return renderCustomIcon(
        {
          ...sharedProps,
          children: (
            <>
              <path d="M12 6V2H8" />
              <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
              <path d="M2 12h2" />
              <path d="M9 11v2" />
              <path d="M15 11v2" />
              <path d="M20 12h2" />
            </>
          ),
        },
        { size: 18 }
      )
    case "gemini":
      return renderCustomIcon(
        {
          ...sharedProps,
          children: (
            <path d="M12 2a4 4 0 0 0-4 4v2H6a4 4 0 0 0 0 8h2v2a4 4 0 0 0 8 0v-2h2a4 4 0 0 0 0-8h-2V6a4 4 0 0 0-4-4Z" />
          ),
        },
        { size: 18 }
      )
    default:
      return renderCustomIcon(
        {
          ...sharedProps,
          children: (
            <>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M12 8v8" />
              <path d="M8 12h8" />
            </>
          ),
        },
        { size: 18 }
      )
  }
}

export function OnionIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </>
      ),
    },
    { size: 18 }
  )
}

export function TimelineIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <rect width="4" height="6" x="2" y="4" rx="1" />
          <rect width="4" height="6" x="10" y="4" rx="1" />
          <rect width="4" height="6" x="18" y="4" rx="1" />
          <path d="M2 14h20" />
          <path d="M6 14v4" />
          <path d="M14 14v4" />
        </>
      ),
    },
    { size: 18 }
  )
}

export function FilmStripIcon(props: IconProps) {
  return <FilmStripBase {...props} />
}

export function EmptyFrameIcon({ className, ...props }: IconProps) {
  return (
    <FrameGridBase
      className={cn("text-muted-foreground/30", className)}
      {...props}
    />
  )
}

export function FrameSelectIcon(props: IconProps) {
  return <FrameGridBase size={28} {...props} />
}

export function GifIcon(props: IconProps) {
  return renderCustomIcon(
    {
      ...props,
      children: (
        <>
          <path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1-3 3H5V4Z" />
          <path d="M19 4h-3v16h3" />
          <path d="M11 4h4" />
          <path d="M13 4v16" />
          <path d="M15 20h-4" />
        </>
      ),
    },
    { size: 15 }
  )
}
