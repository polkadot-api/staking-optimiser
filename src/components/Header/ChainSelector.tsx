import { selectedChain$ } from "@/state/chain";
import { knownChains, type KnownChains } from "@/state/chainConfig";
import { withSubscribe } from "@/util/rxjs";
import { useStateObservable } from "@react-rxjs/core";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const chainNameByChain: Record<KnownChains, string> = {
  polkadot: "Polkadot",
  kusama: "Kusama",
  westend: "Westend",
};

const chainLogoByChain: Record<KnownChains, string> = {
  polkadot: import.meta.env.BASE_URL + "polkadot.svg",
  kusama: import.meta.env.BASE_URL + "kusama.svg",
  westend: import.meta.env.BASE_URL + "polkadot.svg",
};

export const ChainSelector = withSubscribe(() => {
  const chain = useStateObservable(selectedChain$);
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <img src={chainLogoByChain[chain]} alt={chain} className="size-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          {knownChains.map((chain) => (
            <Button key={chain} onClick={() => navigate("/" + chain)}>
              {chainNameByChain[chain]}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
