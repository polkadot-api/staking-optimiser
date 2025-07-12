import { Info } from "lucide-react";
import { TooltipContent, Tooltip, TooltipTrigger } from "./ui/tooltip";
import type { FC, PropsWithChildren } from "react";

export const HintTooltip: FC<PropsWithChildren> = ({ children }) => (
  <Tooltip>
    <TooltipTrigger>
      <Info size={18} className="text-foreground/80" />
    </TooltipTrigger>
    <TooltipContent className="max-w-[100vw]">{children}</TooltipContent>
  </Tooltip>
);

export const TextHintTooltip: FC<{ hint: string }> = ({ hint }) => (
  <HintTooltip>
    <p>{hint}</p>
  </HintTooltip>
);
