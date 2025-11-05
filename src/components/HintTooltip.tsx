import { cn } from "@/lib/utils"
import { codeSplit } from "@/util/codeSplit"
import { Info } from "lucide-react"
import { type FC, type PropsWithChildren } from "react"

const module = import("./ui/tooltip")

export const HintTooltip = codeSplit<
  Awaited<typeof module>,
  PropsWithChildren<{ className?: string, name?: string }>
>(
  module,
  ({ className, name }) => (
    <button aria-label={name} type="button" className={cn("cursor-wait", className)}>
      <Info size={18} className="text-foreground/80" />
    </button>
  ),
  ({ children, payload, className, name }) => {
    const { Tooltip, TooltipTrigger, TooltipContent } = payload

    return (
      <Tooltip>
        <TooltipTrigger aria-label={name} className={className}>
          <Info size={18} className="text-foreground/80" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[100vw]">{children}</TooltipContent>
      </Tooltip>
    )
  },
)

export const TextHintTooltip: FC<{ hint: string; name?: string, className?: string }> = ({
  hint,
  ...props
}) => (
  <HintTooltip {...props}>
    <p>{hint}</p>
  </HintTooltip>
)
