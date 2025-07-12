import { Info } from "lucide-react";
import type * as TooltipModule from "./ui/tooltip";
import { useEffect, useState, type FC, type PropsWithChildren } from "react";

let loadedModule: typeof TooltipModule | null = null;
const tooltipPromise = import("./ui/tooltip").then((mod) => {
  loadedModule = mod;
  return mod;
});
const useModule = () => {
  const [module, setModule] = useState(loadedModule);

  useEffect(() => {
    if (!module) {
      tooltipPromise.then(setModule);
    }
  }, [module]);

  return module;
};

export const HintTooltip: FC<PropsWithChildren> = ({ children }) => {
  const module = useModule();

  if (!module) {
    return (
      <button type="button" className="cursor-wait">
        <Info size={18} className="text-foreground/80" />
      </button>
    );
  }

  const { Tooltip, TooltipTrigger, TooltipContent } = module;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Info size={18} className="text-foreground/80" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[100vw]">{children}</TooltipContent>
    </Tooltip>
  );
};

export const TextHintTooltip: FC<{ hint: string }> = ({ hint }) => (
  <HintTooltip>
    <p>{hint}</p>
  </HintTooltip>
);
