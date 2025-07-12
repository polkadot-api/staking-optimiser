import { state } from "@react-rxjs/core";
import { map, switchMap } from "rxjs";
import { selectedAccountAddr$ } from "./account";
import { typedApi } from "./chain";

export const currentNominationPoolBond$ = state(
  selectedAccountAddr$.pipe(
    switchMap((v) =>
      Promise.all([
        typedApi.query.NominationPools.PoolMembers.getValue(v),
        // might want to use NominationPoolsApi.pointsToBalance instead
        typedApi.query.DelegatedStaking.Delegators.getValue(v),
      ])
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
