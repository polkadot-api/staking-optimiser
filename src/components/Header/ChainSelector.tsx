import { selectedChain$ } from "@/state/chain";
import { knownChains, type KnownChains } from "@/state/chainConfig";
import { withSubscribe } from "@/util/rxjs";
import { useStateObservable } from "@react-rxjs/core";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { codeSplit } from "@/util/codeSplit";

export const chainNameByChain: Record<KnownChains, string> = {
  polkadot: "Polkadot",
  kusama: "Kusama",
  westend: "Westend",
  paseo: "Paseo",
};

export const chainLogoByChain: Record<KnownChains, string> = {
  polkadot: import.meta.env.BASE_URL + "polkadot.svg",
  kusama: import.meta.env.BASE_URL + "kusama.webp",
  westend: import.meta.env.BASE_URL + "westend.webp",
  paseo: import.meta.env.BASE_URL + "paseo.webp",
};

export const ChainSelector = withSubscribe(
  codeSplit(
    import("@/components/ui/popover"),
    () => {
      const chain = useStateObservable(selectedChain$);

      return (
        <Button variant="outline" className="cursor-wait">
          <img
            src={chainLogoByChain[chain]}
            alt={chain}
            className="size-6 rounded"
          />
        </Button>
      );
    },
    ({ payload }) => {
      const { Popover, PopoverContent, PopoverTrigger } = payload;
      const chain = useStateObservable(selectedChain$);
      const navigate = useNavigate();

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <img
                src={chainLogoByChain[chain]}
                alt={chain}
                className="size-6 rounded"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">
                Currently connected to:
              </div>
              <img
                src={chainLogoByChain[chain]}
                alt={chain}
                className="size-6 rounded"
              />{" "}
              {chainNameByChain[chain]}
            </div>
            <div>
              <div className="text-muted-foreground">
                Connect to another network
              </div>
              <ul className="space-y-2 mt-2">
                {knownChains
                  .filter((c) => c !== chain)
                  .map((chain) => (
                    <li key={chain}>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => navigate("/" + chain)}
                      >
                        <img
                          src={chainLogoByChain[chain]}
                          alt={chain}
                          className="size-6 rounded"
                        />
                        {chainNameByChain[chain]}
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      );
    }
  )
);
