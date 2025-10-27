import { cn } from "@/lib/utils";
import { accountStatus$ } from "@/state/account";
import { stakingApi$, stakingSdk$, tokenProps$ } from "@/state/chain";
import { state, useStateObservable } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import { lazy, type FC } from "react";
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  merge,
  switchMap,
} from "rxjs";
import { TextHintTooltip } from "./HintTooltip";
import { TokenValue } from "./TokenValue";
import { formatToken } from "@polkadot-api/react-components";

const SectorChart = lazy(() => import("@/components/SectorChart"));

export const accountBalance$ = accountStatus$.pipeState(
  map((v) => v?.balance ?? null)
);

export const getAddressTotalBalance = (addr: SS58String) =>
  firstValueFrom(
    combineLatest([
      stakingApi$.pipe(
        switchMap((api) => api.query.System.Account.getValue(addr)),
        map((v) => v.data.free + v.data.reserved)
      ),
      tokenProps$.pipe(filter((v) => v != null)),
    ]).pipe(
      map(([balance, props]) => (balance ? formatToken(balance, props) : null))
    )
  );

const bondedStatus$ = accountStatus$.pipeState(
  map((v) => {
    if (!v) return null;

    if (v.nomination.totalLocked) {
      return {
        bond: v.nomination.currentBond,
        unlocks: v.nomination.unlocks,
      };
    }

    if (v.nominationPool.pool) {
      return {
        bond: v.nominationPool.currentBond,
        unlocks: v.nominationPool.unlocks,
      };
    }

    return null;
  })
);

export interface AccountBalanceValue {
  label: string;
  value: bigint;
  color: string;
  tooltip: string;
}

export const AccountBalance: FC<{
  extraValues?: AccountBalanceValue[];
  className?: string;
}> = ({ extraValues = [], className }) => {
  const balance = useStateObservable(accountBalance$);
  const currentBond = useStateObservable(bondedStatus$);

  if (balance == null) {
    return <div>No account selected</div>;
  }

  if (balance.total === 0n) {
    return (
      <div>This account has no balance. Deposit some to start staking</div>
    );
  }

  const bonded = currentBond?.bond ?? 0n;
  const unbonding =
    currentBond?.unlocks.map((v) => v.value).reduce((a, b) => a + b, 0n) ?? 0n;

  // Locked balance that can't stack with staking
  const reservedBalance = balance.raw.reserved - (bonded + unbonding);
  // Locked balance that can be stacked with staking
  const unbondedLockedBalance =
    balance.total === 0n
      ? 0n
      : balance.untouchable - balance.raw.existentialDeposit;

  const data: AccountBalanceValue[] = [
    {
      label: "Reserved",
      value: reservedBalance + balance.raw.existentialDeposit,
      color: "color-mix(in srgb, var(--muted-foreground), transparent 50%)",
      tooltip: "Amount reserved that can't stack with staking bonds.",
    },
    {
      label: "Unbonding",
      value: unbonding,
      color: "color-mix(in srgb, var(--muted-foreground), transparent 50%)",
      tooltip: "Amount being unbounded from staking.",
    },
    {
      label: "Bonded",
      value: bonded,
      color: "var(--muted-foreground)",
      tooltip: "Amount already bonded into staking.",
    },
    {
      label: "Frozen",
      value: unbondedLockedBalance,
      color: "color-mix(in srgb, var(--chart-4), transparent 20%)",
      tooltip:
        "Amount frozen but not used in staking. You can bond this amount and you will still retain the same spendable amount.",
    },
    {
      label: "Spendable",
      value: balance.spendable,
      color: "color-mix(in srgb, var(--color-neutral), transparent 20%)",
      tooltip: "Unlocked amount that can be transferred or used to pay fees.",
    },
    ...extraValues,
  ].filter((v) => v.value > 0n);

  return (
    <div
      className={cn(
        "flex gap-4 items-center justify-center flex-wrap",
        className
      )}
    >
      <SectorChart data={data} />
      <ol className="space-y-2">
        {data.map(({ label, value, color, tooltip }) => (
          <li
            key={label}
            className="border-l-4 rounded p-2 flex gap-2 justify-between"
            style={{
              borderColor: color,
              backgroundColor: `color-mix(in srgb, ${color}, transparent 80%)`,
            }}
          >
            <div>
              <TokenValue value={value} /> {label}
            </div>
            <TextHintTooltip hint={tooltip} />
          </li>
        ))}
      </ol>
    </div>
  );
};

export const accountBalanceSub$ = merge(accountBalance$, bondedStatus$);

const totalBalance$ = state(
  (addr: SS58String) =>
    stakingSdk$.pipe(
      switchMap((v) => v.getAccountStatus$(addr)),
      map((v) => v.balance.total)
    ),
  null
);

export const TotalBalance: FC<{ addr: SS58String }> = ({ addr }) => {
  const balance = useStateObservable(totalBalance$(addr));
  if (!balance) return null;

  return <TokenValue value={balance} />;
};
