import { codeSplit } from "@/util/codeSplit";
import { Info } from "lucide-react";
import { type FC, type PropsWithChildren } from "react";

const module = import("./ui/tooltip");

export const HintTooltip = codeSplit<Awaited<typeof module>, PropsWithChildren>(
  module,
  () => (
    <button type="button" className="cursor-wait">
      <Info size={18} className="text-foreground/80" />
    </button>
  ),
  ({ children, payload }) => {
    const { Tooltip, TooltipTrigger, TooltipContent } = payload;

    return (
      <Tooltip>
        <TooltipTrigger>
          <Info size={18} className="text-foreground/80" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[100vw]">{children}</TooltipContent>
      </Tooltip>
    );
  }
);

export const TextHintTooltip: FC<{ hint: string }> = ({ hint }) => (
  <HintTooltip>
    <p>{hint}</p>
  </HintTooltip>
);
