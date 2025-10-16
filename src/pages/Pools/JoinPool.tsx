import { AlertCard } from "@/components/AlertCard";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { accountStatus$, selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, stakingSdk$, tokenDecimals$ } from "@/state/chain";
import { formatPercentage } from "@/util/format";
import { state, useStateObservable } from "@react-rxjs/core";
import { useState, type FC } from "react";
import { firstValueFrom, switchMap } from "rxjs";

const minJoin$ = stakingApi$.pipeState(
  switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
);

export const JoinPool: FC<{ poolId: number }> = ({ poolId }) => {
  const accountStatus = useStateObservable(accountStatus$);
  const signer = useStateObservable(selectedSignerAccount$);
  const minBond = useStateObservable(minJoin$);

  const cantJoinReason =
    !accountStatus || !signer
      ? "Select an account to join"
      : accountStatus.nomination.maxBond < minBond
        ? "Not enough funds to join"
        : null;

  return (
    <Card
      title="Join this pool"
      className="space-y-4 border-primary/40 bg-primary/5"
    >
      <p className="text-sm text-muted-foreground">
        You can join a nomination pool with a minimum bond of{" "}
        <TokenValue value={minBond} colored={false} /> and start earning rewards
        with the pool's current nomination set.
      </p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          No need to manage validators manually.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          Earn rewards with a smaller bond than direct nomination.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          Withdraw anytime after the unbonding period.
        </li>
      </ul>
      <DialogButton
        disabled={cantJoinReason != null}
        title="Join Pool"
        content={({ close }) => <JoinPoolModal poolId={poolId} close={close} />}
      >
        Join pool
      </DialogButton>
      {cantJoinReason ? (
        <p className="text-xs text-muted-foreground">{cantJoinReason}</p>
      ) : null}
    </Card>
  );
};

const pool$ = state((id: number) =>
  stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id)))
);

const JoinPoolModal: FC<{
  poolId: number;
  close?: () => void;
}> = ({ poolId, close }) => {
  const accountStatus = useStateObservable(accountStatus$);
  const minBond = useStateObservable(minJoin$);
  const pool = useStateObservable(pool$(poolId));
  const decimals = useStateObservable(tokenDecimals$);
  const [bondAmount, setBondAmount] = useState<number>(Number(minBond));

  if (!accountStatus) {
    throw new Error("Missing account");
  }
  if (!pool) return null;

  const maxBond = accountStatus.nomination.maxBond;
  const spendable = accountStatus.balance.spendable;
  const tokenUnit = 10 ** decimals;
  const step = tokenUnit / 100;

  const sliderMin = Number(minBond);
  const sliderMax = Number(maxBond);
  const clampAmount = (raw: number) => {
    if (!Number.isFinite(raw)) return sliderMin || 0;
    const rounded = Math.max(Math.round(raw), sliderMin || 0);
    return sliderMax > 0 ? Math.min(rounded, sliderMax) : rounded;
  };
  const handleSetAmount = (value: number) => setBondAmount(clampAmount(value));

  const amountBig = BigInt(Math.max(Math.round(bondAmount), sliderMin));
  const spendableAfter = spendable - amountBig;

  const alertTooMuchBond = amountBig > maxBond - BigInt(tokenUnit);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">
          #{poolId} {pool.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {pool.memberCount.toLocaleString()} members · Commission{" "}
          {formatPercentage(pool.commission.current)}
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Amount to bond
            </div>
            <div className="flex items-baseline gap-2 text-2xl font-semibold">
              <TokenValue value={amountBig} />
              <span className="text-xs text-muted-foreground">
                Min <TokenValue value={minBond} colored={false} />
              </span>
            </div>
          </div>
          <div className="w-full max-w-[200px]">
            <label
              htmlFor="join-pool-amount"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Amount (tokens)
            </label>
            <Input
              id="join-pool-amount"
              type="number"
              inputMode="decimal"
              min={sliderMin}
              step={step}
              value={bondAmount / tokenUnit}
              onChange={(event) =>
                handleSetAmount(event.target.valueAsNumber * tokenUnit)
              }
            />
          </div>
        </div>

        <Slider
          value={[bondAmount]}
          min={sliderMin}
          max={sliderMax}
          step={step}
          disabled={sliderMax === 0}
          onValueChange={([value]) => handleSetAmount(value)}
        />
      </section>

      <section className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">You will bond</span>
          <TokenValue
            className="tabular-nums font-semibold"
            value={amountBig}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Spendable after submit</span>
          <TokenValue
            className="tabular-nums font-semibold"
            value={spendableAfter >= 0 ? spendableAfter : 0n}
          />
        </div>
        {alertTooMuchBond ? (
          <AlertCard type="warning">
            Careful! If you bond all your balance you might not have enough to
            pay transaction fees, which could lock you out.
          </AlertCard>
        ) : null}
      </section>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Joining bonds the amount immediately. Rewards start accruing with the
          next era.
        </p>
        <TransactionButton
          createTx={async () => {
            const api = await firstValueFrom(stakingApi$);
            return api.tx.NominationPools.join({
              amount: amountBig,
              pool_id: poolId,
            });
          }}
          onSuccess={close}
        >
          Join
        </TransactionButton>
      </div>
    </div>
  );
};
