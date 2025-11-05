import { cn } from "@/lib/utils"
import { codeSplit } from "@/util/codeSplit"
import { Info } from "lucide-react"
import { type FC, type PropsWithChildren } from "react"

const module = import("./ui/tooltip")

export const HintTooltip = codeSplit<
  Awaited<typeof module>,
  PropsWithChildren<{ className?: string }>
>(
  module,
  ({ className }) => (
    <button type="button" className={cn("cursor-wait", className)}>
      <Info size={18} className="text-foreground/80" />
    </button>
  ),
  ({ children, payload, className }) => {
    const { Tooltip, TooltipTrigger, TooltipContent } = payload

    return (
      <Tooltip>
        <TooltipTrigger className={className}>
          <Info size={18} className="text-foreground/80" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[100vw]">{children}</TooltipContent>
      </Tooltip>
    )
  },
)

export const TextHintTooltip: FC<{ hint: string; className?: string }> = ({
  hint,
  className,
}) => (
  <HintTooltip className={className}>
    <p>{hint}</p>
  </HintTooltip>
)
