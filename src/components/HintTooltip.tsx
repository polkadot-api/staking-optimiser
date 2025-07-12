import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger } from "./ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";
import type { FC, PropsWithChildren } from "react";

export const HintTooltip: FC<PropsWithChildren> = ({ children }) => (
  <Tooltip>
    <TooltipTrigger>
      <Info size={18} className="text-foreground/80" />
    </TooltipTrigger>
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
);

export const TextHintTooltip: FC<{ hint: string }> = ({ hint }) => (
  <HintTooltip>
    <p className="max-w-sm bg-background/60 backdrop-blur-xs p-2 rounded shadow">
      {hint}
    </p>
  </HintTooltip>
);
