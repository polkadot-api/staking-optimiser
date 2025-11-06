import { cn } from "@/lib/utils"
import { codeSplit } from "@/util/codeSplit"
import { Info } from "lucide-react"
import {
  type DetailedHTMLProps,
  type FC,
  type PropsWithChildren,
  type ReactNode,
} from "react"

const module = import("./ui/tooltip")

export const RawTooltip = codeSplit<
  Awaited<typeof module>,
  DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & { tip: ReactNode }
>(
  module,
  ({ className, name, children, ...props }) => (
    <button
      aria-label={name}
      {...props}
      type="button"
      className={cn("cursor-wait", className)}
    >
      {children}
    </button>
  ),
  ({ children, payload, tip, name, ...props }) => {
    const { Tooltip, TooltipTrigger, TooltipContent } = payload

    return (
      <Tooltip>
        <TooltipTrigger aria-label={name} {...props}>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-[100vw]">{tip}</TooltipContent>
      </Tooltip>
    )
  },
)

export const HintTooltip: FC<
  PropsWithChildren<{ className?: string; name?: string }>
> = ({ children, ...props }) => (
  <RawTooltip {...props} tip={children}>
    <Info size={18} className="text-foreground/80" />
  </RawTooltip>
)

export const TextHintTooltip: FC<{
  hint: string
  name?: string
  className?: string
}> = ({ hint, ...props }) => (
  <HintTooltip {...props}>
    <p>{hint}</p>
  </HintTooltip>
)
