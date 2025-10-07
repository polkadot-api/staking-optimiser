import { accountBalance$ } from "@/components/AccountBalance";
import { AlertCard } from "@/components/AlertCard";
import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { accountStatus$, selectedSignerAccount$ } from "@/state/account";
import {
  stakingApi$,
  stakingSdk$,
  tokenDecimals$,
  tokenProps$,
} from "@/state/chain";
import { currentEra$, eraDurationInMs$ } from "@/state/era";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { useState, type FC } from "react";
import { firstValueFrom, switchMap } from "rxjs";
import { format } from "timeago.js";

const minBond$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
  )
);

export const ManageBond = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$);
  const balance = useStateObservable(accountBalance$);
  const [mode, setMode] = useState<"bond" | "unbond">("bond");
  const [bond, setBond] = useState(0);
  const [unbond, setUnbond] = useState(0);

  if (!balance) return null;
  if (!poolStatus) return <div>TODO not in a pool</div>;

  return (
    <section className="space-y-5">
      <Stats />
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as any)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bond">Bond Extra</TabsTrigger>
          <TabsTrigger value="unbond">Unbond</TabsTrigger>
        </TabsList>
        <TabsContent value="bond">
          <BondInput bond={bond} setBond={setBond} />
        </TabsContent>
        <TabsContent value="unbond">
          <UnbondInput bond={unbond} setBond={setUnbond} />
        </TabsContent>
      </Tabs>
      <Result bond={mode === "bond" ? bond : -unbond} />
    </section>
  );
};

const BondInput: FC<{ bond: number; setBond: (bond: number) => void }> = ({
  bond,
  setBond,
}) => {
  const accountStatus = useStateObservable(accountStatus$);
  const token = useStateObservable(tokenProps$);
  const minBond = useStateObservable(minBond$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);

  if (!accountStatus || !token) return null;
  const { decimals, symbol } = token;
  const { balance, nominationPool: poolStatus } = accountStatus;

  const bigBond = Number.isNaN(bond) ? 0n : BigInt(Math.round(bond));

  const currentUnbonding = poolStatus.unlocks
    .map((v) => v.value)
    .reduce((a, b) => a + b, 0n);

  const maxBond =
    balance.total - balance.raw.existentialDeposit - currentUnbonding;
  const tokenUnit = 10n ** BigInt(decimals);
  const maxSafeBond = maxBond - tokenUnit;

  const clampBondValue = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), Number(maxBond));
  };

  const setBondValue = (value: number) => setBond(clampBondValue(value));

  const resultingBondExtra = bigBond + poolStatus.pendingRewards;
  const resultingBond = poolStatus.currentBond + resultingBondExtra;

  const showBelowMinWarning = resultingBond > 0n && resultingBond < minBond;
  const showSafeMaxWarning =
    maxSafeBond > 0n && resultingBond > maxSafeBond + poolStatus.pendingRewards;

  const performBond = async () => {
    if (!selectedAccount) return null;

    const api = await firstValueFrom(stakingApi$);
    return api.tx.NominationPools.bond_extra({
      extra: NominationPoolsBondExtra.FreeBalance(bigBond),
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Amount to bond</p>
          <p className="text-xs text-muted-foreground">
            Added immediately to your pool stake.
          </p>
        </div>
        <TokenValue className="text-base font-semibold" value={bigBond} />
      </div>
      <Slider
        value={[bond]}
        min={0}
        max={Number(maxBond - poolStatus.currentBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBondValue(value)}
        onValueCommit={([value]) => setBondValue(value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto">
          <label
            className="mb-1 block text-xs font-medium text-muted-foreground"
            htmlFor="bond-amount-input"
          >
            Amount ({symbol})
          </label>
          <Input
            id="bond-amount-input"
            type="number"
            inputMode="decimal"
            className="w-full sm:w-52"
            value={Number.isFinite(bond) ? bond / Number(tokenUnit) : 0}
            onChange={(event) => {
              const next = event.target.valueAsNumber;
              if (Number.isNaN(next)) {
                return;
              }
              setBondValue(next * Number(tokenUnit));
            }}
          />
        </div>
      </div>

      {showBelowMinWarning ? (
        <AlertCard type="error">
          Can't have a bond smaller than{" "}
          <TokenValue value={minBond} colored={false} />. Please increase the
          bond or remove all of it.
        </AlertCard>
      ) : null}

      {showSafeMaxWarning ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
      <TransactionButton
        className="w-full"
        disabled={resultingBond < minBond || resultingBondExtra == 0n}
        signer={selectedAccount?.polkadotSigner}
        createTx={performBond}
      >
        Bond
      </TransactionButton>
    </div>
  );
};

const UnbondInput: FC<{ bond: number; setBond: (bond: number) => void }> = ({
  bond,
  setBond,
}) => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$);
  const accountStatus = useStateObservable(accountStatus$);
  const token = useStateObservable(tokenProps$);
  const minBond = useStateObservable(minBond$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);

  if (!accountStatus || !poolStatus || !token) return null;
  const { decimals, symbol } = token;
  const currentBond = accountStatus.nominationPool.currentBond;

  const bigBond = Number.isNaN(bond) ? 0n : BigInt(Math.round(bond));
  const resultingBond = currentBond - bigBond;

  const tokenUnit = 10n ** BigInt(decimals);

  const clampBondValue = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), Number(currentBond));
  };

  const setBondValue = (value: number) => setBond(clampBondValue(value));

  const showBelowMinWarning = resultingBond > 0n && resultingBond < minBond;

  const unbond = async () => {
    if (!selectedAccount) return null;

    const sdk = await firstValueFrom(stakingSdk$);

    // Accounting for BigInt <-> Number error
    // assuming we're not letting the user unbond with an in-between value.
    const unbonding =
      resultingBond == 0n
        ? currentBond
        : resultingBond < minBond
          ? currentBond - minBond
          : bigBond;
    return sdk.unbondNominationPool(selectedAccount.address, unbonding);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/90 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Amount to unbond</p>
          <p className="text-xs text-muted-foreground">
            Starts the unbonding period (about 28 days).
          </p>
        </div>
        <TokenValue className="text-base font-semibold" value={bigBond} />
      </div>
      <Slider
        value={[bond]}
        min={0}
        max={Number(currentBond)}
        step={10 ** (token.decimals - 2)}
        onValueChange={([value]) => setBondValue(value)}
        onValueCommit={([value]) => setBondValue(value)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto">
          <label
            className="mb-1 block text-xs font-medium text-muted-foreground"
            htmlFor="bond-amount-input"
          >
            Amount ({symbol})
          </label>
          <Input
            id="bond-amount-input"
            type="number"
            inputMode="decimal"
            className="w-full sm:w-52"
            value={Number.isFinite(bond) ? bond / Number(tokenUnit) : 0}
            onChange={(event) => {
              const next = event.target.valueAsNumber;
              if (Number.isNaN(next)) {
                return;
              }
              setBondValue(next * Number(tokenUnit));
            }}
          />
        </div>
      </div>

      {showBelowMinWarning ? (
        <AlertCard type="error">
          Can't have a bond smaller than{" "}
          <TokenValue value={minBond} colored={false} />. Please increase the
          bond or remove all of it.
        </AlertCard>
      ) : null}
      <TransactionButton
        className="w-full"
        disabled={resultingBond < minBond || bigBond == 0n}
        signer={selectedAccount?.polkadotSigner}
        createTx={unbond}
      >
        Unbond
      </TransactionButton>
    </div>
  );
};

const Stats = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$);
  const balance = useStateObservable(accountBalance$);
  const minBond = useStateObservable(minBond$);

  if (!poolStatus || !balance) return null;

  const currentUnbonding = poolStatus.unlocks
    .map((v) => v.value)
    .reduce((a, b) => a + b, 0n);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <StatTile
        label="Current bond"
        value={poolStatus.bond}
        description="Already staked in this pool"
        highlight
      />
      <StatTile
        label="Spendable balance"
        value={balance.spendable}
        description="Available before you make changes"
      />
      {poolStatus.pendingRewards ? (
        <StatTile
          label="Pending rewards"
          value={poolStatus.pendingRewards}
          description="Will be bonded automatically if you add stake"
        />
      ) : null}
      {currentUnbonding ? (
        <StatTile
          label="Currently unlocking"
          value={currentUnbonding}
          description="Waiting for the unbonding period to finish"
        />
      ) : null}
      <StatTile
        label="Minimum required bond"
        value={minBond}
        description="Drop to zero if you want to leave the pool"
      />
    </div>
  );
};

const StatTile: FC<{
  label: string;
  value: bigint;
  description?: string;
  highlight?: boolean;
}> = ({ label, value, description, highlight = false }) => (
  <div
    className={cn(
      "rounded-md border border-border/60 bg-muted/30 p-3 text-sm transition-colors",
      highlight && "border-primary/70 bg-primary/5"
    )}
  >
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <div className="mt-1 text-base font-semibold leading-tight">
      <TokenValue className="text-lg font-semibold" value={value} />
    </div>
    {description ? (
      <p className="mt-1 text-[11px] text-muted-foreground/80">{description}</p>
    ) : null}
  </div>
);

const Result: FC<{ bond: number }> = ({ bond }) => {
  const account = useStateObservable(accountStatus$);
  const decimals = useStateObservable(tokenDecimals$);
  const currentEra = useStateObservable(currentEra$);
  const eraDuration = useStateObservable(eraDurationInMs$);

  if (!account || decimals == null || currentEra == null) return null;
  const { balance, nominationPool: poolStatus } = account;

  const bigBond = Number.isNaN(bond) ? 0n : BigInt(Math.round(bond));

  const spendableAfter =
    balance.spendable -
    (bigBond < 0n ? 0n : bigBond) +
    poolStatus.pendingRewards;
  const resultingBond = poolStatus.currentBond + bigBond;

  const unlocks =
    bigBond < 0n
      ? [
          ...poolStatus.unlocks,
          {
            era: currentEra + 28,
            value: -bigBond,
          },
        ]
      : poolStatus.unlocks;
  const totalUnlocks = unlocks.map((v) => v.value).reduce((a, b) => a + b, 0n);
  const unlocksByEra = unlocks.reduce((acc: Record<number, bigint>, v) => {
    acc[v.era] = (acc[v.era] ?? 0n) + v.value;
    return acc;
  }, {});

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span>Resulting bond</span>
        <TokenValue
          className="tabular-nums font-semibold"
          value={resultingBond}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {bigBond > 0n
          ? "Additional stake will be bonded immediately."
          : bigBond < 0n
            ? "The amount will begin the unbonding period."
            : "Move the slider or enter an amount to preview the change."}
      </div>

      <div className="h-px bg-border/60" />

      <div className="flex items-center justify-between">
        <span>Spendable after submit</span>
        <TokenValue
          className="tabular-nums font-semibold"
          value={spendableAfter}
        />
      </div>
      {poolStatus.pendingRewards ? (
        <div className="text-xs text-muted-foreground">
          Includes <TokenValue value={poolStatus.pendingRewards} /> from pending
          rewards.
        </div>
      ) : null}

      <div className="h-px bg-border/60" />

      {unlocks.length === 0 ? null : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Resulting unlocks</span>
            <TokenValue
              className="tabular-nums font-semibold"
              value={totalUnlocks}
            />
          </div>
          <div className="max-h-40 space-y-2 overflow-auto pr-1">
            {Object.entries(unlocksByEra).map(([era, value]) => {
              const unlocking = eraDuration * (Number(era) - currentEra);
              return (
                <div
                  key={era}
                  className="flex items-center justify-between rounded-md border border-border/50 bg-background/80 px-3 py-2 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      Era {era}
                    </span>
                    <span className="text-muted-foreground">
                      {unlocking === 0
                        ? "Unlocks next era"
                        : `Unlocks ${format(new Date(Date.now() + unlocking))}`}
                    </span>
                  </div>
                  <TokenValue
                    className="tabular-nums font-semibold"
                    value={value}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
