import { sinkSuspense, state } from "@react-rxjs/core";
import { switchMapSuspended } from "@react-rxjs/utils";
import { combineLatest, map, switchMap } from "rxjs";
import { selectedAccountAddr$ } from "./account";
import { stakingApi$ } from "./chain";

export const currentNominationPoolStatus$ = state(
  combineLatest([stakingApi$, selectedAccountAddr$]).pipe(
    switchMapSuspended(([stakingApi, selectedAccount]) => {
      if (!selectedAccount) return [null];

      return stakingApi.query.NominationPools.PoolMembers.watchValue(
        selectedAccount
      ).pipe(
        switchMap((member) => {
          if (!member) return [null];

          return combineLatest([
            stakingApi.apis.NominationPoolsApi.points_to_balance(
              member.pool_id,
              member.points
            ),
            stakingApi.apis.NominationPoolsApi.pending_rewards(selectedAccount),
            stakingApi.query.NominationPools.BondedPools.getValue(
              member.pool_id
            ),
            stakingApi.query.NominationPools.Metadata.getValue(member.pool_id),
          ]).pipe(
            map(([bond, pendingRewards, pool, metadata]) => ({
              ...pool!,
              ...member,
              bond,
              unbonding_eras: member.unbonding_eras.map(([era, value]) => ({
                era,
                value,
              })),
              name: metadata.asText(),
              pendingRewards,
            }))
          );
        })
      );
    }),
    sinkSuspense()
  )
);
