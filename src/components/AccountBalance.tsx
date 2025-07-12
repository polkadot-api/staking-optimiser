import { selectedAccountAddr$ } from "@/state/account";
import { typedApi } from "@/state/chain";
import { currentNominatorBond$ } from "@/state/nominate";
import { currentNominationPoolBond$ } from "@/state/nominationPool";
import { maxBigInt } from "@/util/bigint";
import { state, useStateObservable } from "@react-rxjs/core";
import { lazy } from "react";
import { combineLatest, defer, map, switchMap, withLatestFrom } from "rxjs";
import { TokenValue } from "./TokenValue";

const SectorChart = lazy(() => import("@/components/SectorChart"));

const accountBalance$ = state(
  selectedAccountAddr$.pipe(
    switchMap((v) => typedApi.query.System.Account.watchValue(v)),
    map((v) => v.data),
    withLatestFrom(
      defer(() => typedApi.constants.Balances.ExistentialDeposit())
    ),
    map(([v, existentialDeposit]) => {
      // https://wiki.polkadot.network/learn/learn-account-balances/

      // Total tokens in the account
      const total = v.reserved + v.free;

      // Portion of "free" balance that can't be transferred.
      const untouchable =
        total == 0n ? 0n : maxBigInt(v.frozen - v.reserved, existentialDeposit);

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
);

const bondedStatus$ = state(
  combineLatest([currentNominatorBond$, currentNominationPoolBond$]).pipe(
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

export const AccountBalance = () => {
  const balance = useStateObservable(accountBalance$);
  const currentBond = useStateObservable(bondedStatus$);

  const bonded = currentBond?.bond ?? 0n;
  const unbonding =
    currentBond?.unlocks.map((v) => v.value).reduce((a, b) => a + b, 0n) ?? 0n;
  const unbondedLockedBalance =
    balance.total === 0n ? 0n : balance.locked - (currentBond?.bond ?? 0n);

  const data = [
    {
      label: "Bonded",
      value: bonded - unbonding,
    },
    {
      label: "Unbonding",
      value: unbonding,
    },
    {
      label: "Locked",
      value: unbondedLockedBalance,
    },
    {
      label: "Spendable",
      value: balance.spendable,
    },
  ].filter((v) => v.value > 0n);

  return (
    <div>
      <SectorChart data={data} />
      <div>
        {data.map(({ label, value }) => (
          <div key={label}>
            {label}: <TokenValue value={value} />
          </div>
        ))}
      </div>
    </div>
  );
};
