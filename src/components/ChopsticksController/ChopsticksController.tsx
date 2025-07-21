import type { FormEvent } from "react";
import { ReactSVG } from "react-svg";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import logo from "./chopsticks.svg";
import { useControllerAction } from "./controllerAction";
import { ControllerStatusIndicator } from "./ControllerStatusIndicator";
import { combineLatest, firstValueFrom, map } from "rxjs";
import { clients$, tokenDecimals$ } from "@/state/chain";

export const ChopsticksController = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ReactSVG
            src={logo}
            beforeInjection={(svg) => {
              svg.setAttribute("width", String(24));
              svg.setAttribute("height", String(24));
            }}
          />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chopsticks operations</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <NextEra />
          <ResetBalance />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const NextEra = () => {
  const { handler, status } = useControllerAction(async () => {
    // TODO rofl
  });

  return (
    <div>
      <h3 className="text-sm font-medium">Jump to next era</h3>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handler}>
          Jump
        </Button>
        <ControllerStatusIndicator status={status} />
      </div>
    </div>
  );
};

const ResetBalance = () => {
  const { handler, status } = useControllerAction(
    async (evt: FormEvent<HTMLFormElement>) => {
      const accountId = evt.currentTarget.address.value;
      const value = evt.currentTarget.value.value;

      const [client, tokenDecimals] = await firstValueFrom(
        combineLatest([
          clients$.pipe(map((v) => v.stakingClient)),
          tokenDecimals$,
        ])
      );

      const amount = BigInt(Math.round(value * 10 ** tokenDecimals));

      await client._request("dev_setStorage", [
        {
          system: {
            account: [
              [
                [accountId],
                { providers: 1, data: { free: amount.toString() } },
              ],
            ],
          },
        },
      ]);
      client._request("dev_newBlock", []);
    }
  );

  return (
    <div>
      <h3 className="text-sm font-medium">Set free balance of account</h3>
      <form onSubmit={handler}>
        <div className="flex items-center gap-2">
          <Input name="address" placeholder="Address" />
          <Input name="value" type="number" placeholder="Value" />
          <Input className="shrink-0 w-auto" type="submit" value="Set" />
          <ControllerStatusIndicator status={status} />
        </div>
      </form>
    </div>
  );
};
