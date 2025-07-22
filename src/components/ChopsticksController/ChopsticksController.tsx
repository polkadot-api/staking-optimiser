import { useRef, type FormEvent } from "react";
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
import { combineLatest, firstValueFrom, map, skip } from "rxjs";
import { clients$, tokenDecimals$ } from "@/state/chain";
import { getTypedCodecs, type HexString } from "polkadot-api";
import { u64 } from "@polkadot-api/substrate-bindings";
import { toHex } from "polkadot-api/utils";
import { activeEra$, refreshEra$ } from "@/state/era";
import { dot } from "@polkadot-api/descriptors";

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
          <SkipEras />
          <ResetBalance />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const stakingCodecs = await getTypedCodecs(dot);
const SkipEras = () => {
  const ref = useRef<HTMLInputElement | null>(null);
  const { handler, status } = useControllerAction(async () => {
    const erasToSkip = ref.current?.valueAsNumber ?? 1;

    const [{ client, typedApi }, activeEra] = await firstValueFrom(
      combineLatest([
        clients$.pipe(
          map((v) => ({ client: v.stakingClient, typedApi: v.stakingApi }))
        ),
        activeEra$,
      ])
    );

    const api = client.getUnsafeApi();
    const [
      currentTimestamp,
      blockTime,
      epochDuration,
      genesisSlot,
      sessionsPerEra,
    ] = await Promise.all([
      api.query.Timestamp.Now.getValue() as Promise<bigint>,
      api.constants.Babe.ExpectedBlockTime() as Promise<bigint>,
      api.constants.Babe.EpochDuration() as Promise<bigint>,
      api.query.Babe.GenesisSlot.getValue() as Promise<bigint>,
      typedApi.constants.Staking.SessionsPerEra(),
    ]);
    const [timestampKey, slotKey, epochKey, activeEraKey, currentEraKey] =
      await Promise.all([
        api.query.Timestamp.Now.getKey(),
        api.query.Babe.CurrentSlot.getKey(),
        api.query.Babe.EpochIndex.getKey(),
        typedApi.query.Staking.ActiveEra.getKey(),
        typedApi.query.Staking.CurrentEra.getKey(),
      ]);

    const newTimestamp =
      currentTimestamp +
      epochDuration * blockTime * BigInt(sessionsPerEra * erasToSkip);
    const newSlot = newTimestamp / blockTime;
    const newEpoch = (newSlot - genesisSlot) / epochDuration;

    const storageChanges: Array<[HexString, HexString]> = [
      [timestampKey, toHex(u64.enc(newTimestamp))],
      [slotKey, toHex(u64.enc(newSlot))],
      [epochKey, toHex(u64.enc(newEpoch))],
      [
        activeEraKey,
        toHex(
          stakingCodecs.query.Staking.ActiveEra.value.enc({
            index: activeEra.era + erasToSkip,
            start: BigInt(Date.now()),
          })
        ),
      ],
      [
        currentEraKey,
        toHex(
          stakingCodecs.query.Staking.CurrentEra.value.enc(
            activeEra.era + erasToSkip
          )
        ),
      ],
    ];

    const nextBlock = firstValueFrom(client.finalizedBlock$.pipe(skip(1)));
    await client._request("dev_setStorage", [storageChanges]);
    await client._request("dev_newBlock", []);
    await nextBlock;
    refreshEra$.next();
  });

  return (
    <div>
      <h3 className="text-sm font-medium">Skip Eras</h3>
      <div className="flex items-center gap-2">
        <Input type="number" ref={ref} defaultValue={1} />
        <Button variant="outline" onClick={handler}>
          Skip
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
      await client._request("dev_newBlock", []);
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
