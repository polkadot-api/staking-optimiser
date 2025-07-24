import { selectedAccountAddr$ } from "@/state/account";
import { balancesApi$ } from "@/state/chain";
import { currentNominatorBond$ } from "@/state/nominate";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { maxBigInt } from "@/util/bigint";
import { state, useStateObservable } from "@react-rxjs/core";
import { lazy, type FC } from "react";
import { combineLatest, map, switchMap } from "rxjs";
import { TextHintTooltip } from "./HintTooltip";
import { TokenValue } from "./TokenValue";
import { cn } from "@/lib/utils";

const SectorChart = lazy(() => import("@/components/SectorChart"));

export const accountBalance$ = state(
  combineLatest([selectedAccountAddr$, balancesApi$]).pipe(
    switchMap(([v, balancesApi]) =>
      v
        ? combineLatest([
            balancesApi.query.System.Account.watchValue(v),
            balancesApi.constants.Balances.ExistentialDeposit(),
          ]).pipe(
            map(([v, ed]) => [v.data, ed] as const),
            map(([v, existentialDeposit]) => {
              // https://wiki.polkadot.network/learn/learn-account-balances/

              // Total tokens in the account
              const total = v.reserved + v.free;

              // Portion of "free" balance that can't be transferred.
              const untouchable =
                total == 0n
                  ? 0n
                  : maxBigInt(v.frozen - v.reserved, existentialDeposit);

              // Portion of "free" balance that can be transferred
              const spendable = v.free - untouchable;

              // Portion of "total" balance that is somehow locked
              const locked = v.reserved + untouchable;

              return {
                ...v,
                existentialDeposit: total == 0n ? 0n : existentialDeposit,
                total,
                locked,
                spendable,
                untouchable,
              };
            })
          )
        : [null]
    )
  )
);

const bondedStatus$ = state(
  combineLatest([currentNominatorBond$, currentNominationPoolStatus$]).pipe(
    map(([direct, pool]) =>
      direct
        ? {
            bond: direct.total,
            unlocks: direct.unlocking,
          }
        : pool
          ? {
              bond: pool.bond,
              unlocks: pool.unbonding_eras,
            }
          : null
    )
  )
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
  const unbondedLockedBalance =
    balance.total === 0n
      ? 0n
      : // ExistentialDeposit is part of "locked" because it's "untouchable", i.e. can't be spend without killing the account
        // so we have to remove it from here. We could add it as a separate category but... not worth it for just the ED
        balance.locked -
        balance.existentialDeposit -
        (currentBond?.bond ?? 0n) -
        unbonding;

  const data: AccountBalanceValue[] = [
    {
      label: "Bonded",
      value: bonded - unbonding,
      color: "var(--muted-foreground)",
      tooltip: "Amount already bonded into staking.",
    },
    {
      label: "Unbonding",
      value: unbonding,
      color: "color-mix(in srgb, var(--muted-foreground), transparent 50%)",
      tooltip: "Amount being unbounded from staking.",
    },
    {
      label: "Locked",
      value: unbondedLockedBalance,
      color: "color-mix(in srgb, var(--chart-4), transparent 20%)",
      tooltip:
        "Amount locked but not used in staking. You can bond this amount and you will still retain the same spendable amount.",
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
