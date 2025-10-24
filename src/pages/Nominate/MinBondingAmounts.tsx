import { Card } from "@/components/Card";
import { TokenValue } from "@/components/TokenValue";
import { accountStatus$ } from "@/state/account";
import { stakingApi$ } from "@/state/chain";
import { activeEra$ } from "@/state/era";
import { state, useStateObservable } from "@react-rxjs/core";
import { defer, map, merge, repeat, skip, switchMap } from "rxjs";

export const minBond$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.Staking.MinNominatorBond.getValue())
  )
);

export const lastMinActiveStake$ = state(
  stakingApi$.pipe(
    switchMap((api) =>
      defer(api.query.Staking.MinimumActiveStake.getValue).pipe(
        repeat({
          delay: () => activeEra$.pipe(skip(1)),
        })
      )
    )
  )
);

export const bondableAmount$ = accountStatus$.pipeState(
  map((account) => account?.nomination.maxBond ?? null)
);

export const MinBondingAmounts = () => {
  const minBond = useStateObservable(minBond$);
  const lastMinActiveStake = useStateObservable(lastMinActiveStake$);
  const bondableAmount = useStateObservable(bondableAmount$);

  return (
    <div className="flex flex-wrap gap-4">
      <Card
        className="grow"
        title="Minimum Bond"
        hint="Minimum bond required to start nominating"
      >
        <TokenValue value={minBond} />
      </Card>
      <Card
        className="grow"
        title="Minimum Active Stake"
        hint="Bond of the nominator with the least bond that earned rewards in the previous era. This varies per era and depends on the amount of accounts wanting to nominate and their bond."
      >
        <TokenValue value={lastMinActiveStake} />
      </Card>
      <Card
        className="grow"
        title="Your maximum bond"
        hint="Amount you have at your balance that can be bonded"
      >
        {bondableAmount ? <TokenValue value={bondableAmount} /> : "N/A"}
      </Card>
    </div>
  );
};

export const minBondingAmountsSub$ = merge(
  minBond$,
  lastMinActiveStake$,
  bondableAmount$
);
