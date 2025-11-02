import { AlertCard } from "@/components/AlertCard";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { TokenInput } from "@/components/TokenInput";
import { TokenValue } from "@/components/TokenValue";
import { TransactionButton } from "@/components/Transactions";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { accountStatus$, selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, stakingSdk$, tokenProps$ } from "@/state/chain";
import { formatPercentage } from "@/util/format";
import { state, useStateObservable } from "@react-rxjs/core";
import { useState, type FC } from "react";
import { firstValueFrom, merge, switchMap } from "rxjs";

export const minPoolJoin$ = stakingApi$.pipeState(
  switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
);

export const JoinPool: FC<{ poolId: number }> = ({ poolId }) => {
  const accountStatus = useStateObservable(accountStatus$);
  const signer = useStateObservable(selectedSignerAccount$);
  const minBond = useStateObservable(minPoolJoin$);

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
        needsSigner
      >
        Join pool
      </DialogButton>
      {cantJoinReason ? (
        <p className="text-xs text-muted-foreground">{cantJoinReason}</p>
      ) : null}
    </Card>
  );
};

export const joinPoolSub$ = merge(
  accountStatus$,
  selectedSignerAccount$,
  minPoolJoin$
);

const pool$ = state((id: number) =>
  stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id)))
);

const JoinPoolModal: FC<{
  poolId: number;
  close?: () => void;
}> = ({ poolId, close }) => {
  const accountStatus = useStateObservable(accountStatus$);
  const minBond = useStateObservable(minPoolJoin$);
  const pool = useStateObservable(pool$(poolId));
  const token = useStateObservable(tokenProps$);
  const [bond, setBond] = useState<bigint | null>(minBond);

  if (!pool || !accountStatus || !token) return null;
  const { decimals, symbol } = token;
  const { nomination: nominationStatus } = accountStatus;

  const tokenUnit = 10n ** BigInt(decimals);
  const maxBond = nominationStatus.maxBond;
  const maxSafeBond = maxBond - tokenUnit;

  const showSafeMaxWarning = bond != null && bond > maxSafeBond;

  const {
    reserved: nonStakingReserves,
    frozen,
    existentialDeposit,
  } = accountStatus.balance.raw;
  const rounding = 10n ** BigInt(token.decimals - 2);
  const stakingFrozen =
    rounding *
    ((frozen - nonStakingReserves - existentialDeposit) / rounding + 1n);

  const frozenRangePct = Math.round(
    (100 * Number(stakingFrozen - minBond)) / Number(maxBond - minBond)
  );

  const reservedAfter = bond ? nonStakingReserves + bond : null;
  const lockedAfter = reservedAfter
    ? reservedAfter + existentialDeposit > frozen
      ? reservedAfter + existentialDeposit
      : frozen
    : null;
  const spendableAfter = lockedAfter
    ? accountStatus.balance.total - lockedAfter
    : null;

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
              <span className="text-xs text-muted-foreground">
                Min <TokenValue value={minBond} colored={false} />
              </span>
            </div>
          </div>
          <div className="w-32">
            <TokenInput
              type="number"
              inputMode="decimal"
              value={bond}
              onChange={setBond}
              symbol={symbol}
            />
          </div>
        </div>

        <Slider
          value={[Number(bond)]}
          min={Number(minBond)}
          max={Number(maxBond)}
          step={10 ** (token.decimals - 2)}
          onValueChange={([value]) => setBond(BigInt(Math.round(value)))}
          rangeOverlay={
            frozenRangePct > 0 ? (
              <div
                className="absolute bg-chart-4 opacity-50 top-0 bottom-0 left-0"
                style={{
                  width: `${frozenRangePct}%`,
                }}
              />
            ) : null
          }
          rangeTicks
        />
        <div>
          {stakingFrozen >= minBond ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setBond(stakingFrozen);
              }}
            >
              Eq to frozen
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Spendable after submit</span>
          {spendableAfter != null ? (
            <TokenValue
              className="tabular-nums font-semibold"
              value={spendableAfter}
            />
          ) : (
            "-"
          )}
        </div>
        {showSafeMaxWarning ? (
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
            if (!bond) return null;

            const api = await firstValueFrom(stakingApi$);
            return api.tx.NominationPools.join({
              amount: bond,
              pool_id: poolId,
            });
          }}
          onSuccess={close}
          disabled={bond == null || bond < minBond}
        >
          Join
        </TransactionButton>
      </div>
    </div>
  );
};
