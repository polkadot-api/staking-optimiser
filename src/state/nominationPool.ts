import { sinkSuspense, state } from "@react-rxjs/core"
import { switchMapSuspended } from "@react-rxjs/utils"
import { combineLatest, map, switchMap } from "rxjs"
import { accountStatus$, selectedAccountAddr$ } from "./account"
import { stakingApi$ } from "./chain"

export const currentNominationPoolStatus$ = state(
  combineLatest([stakingApi$, selectedAccountAddr$]).pipe(
    switchMapSuspended(([stakingApi, selectedAccount]) => {
      if (!selectedAccount) return [null]

      return accountStatus$.pipe(
        switchMap((status) => {
          if (!status) return [null]

          const {
            currentBond: bond,
            pendingRewards,
            points,
            pool,
            unlocks,
          } = status.nominationPool

          if (!pool) {
            return [
              {
                bond,
                pendingRewards,
                points,
                unlocks,
                pool: null,
              },
            ]
          }

          const id = pool
          return combineLatest([
            stakingApi.query.NominationPools.BondedPools.getValue(id),
            stakingApi.query.NominationPools.Metadata.getValue(id),
          ]).pipe(
            map(([pool, metadata]) => ({
              bond,
              pendingRewards,
              unlocks,
              points,
              pool: {
                ...pool,
                id,
                name: metadata.asText(),
              },
            })),
          )
        }),
      )
    }),
    sinkSuspense(),
  ),
)
