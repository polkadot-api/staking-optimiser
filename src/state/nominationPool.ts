import { state } from "@react-rxjs/core";
import { combineLatest, map, switchMap } from "rxjs";
import { selectedAccountAddr$ } from "./account";
import { stakingApi$ } from "./chain";

export const currentNominationPoolBond$ = state(
  combineLatest([selectedAccountAddr$, stakingApi$]).pipe(
    switchMap(([v, stakingApi]) =>
      v
        ? Promise.all([
            stakingApi.query.NominationPools.PoolMembers.getValue(v),
            // might want to use NominationPoolsApi.pointsToBalance instead
            stakingApi.query.DelegatedStaking.Delegators.getValue(v),
          ])
        : [[null, null]]
    ),
    map(([poolMembership, delegator]) =>
      poolMembership && delegator
        ? {
            ...poolMembership,
            bond: delegator.amount,
            unbonding_eras: poolMembership.unbonding_eras.map(
              ([era, value]) => ({ value, era })
            ),
          }
        : null
    )
  )
);
