import { selectedSignerAccount$ } from "@/state/account"
import { stakingApi$ } from "@/state/chain"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { MultiAddress } from "@polkadot-api/descriptors"
import { liftSuspense, state, useStateObservable } from "@react-rxjs/core"
import { combineLatest, filter, firstValueFrom, map } from "rxjs"
import { slashingSpans$ } from "../Nominate/NominateLocks"
import { Locks } from "@/components/Locks"

const locks$ = state(
  combineLatest([
    activeEra$,
    eraDurationInMs$,
    currentNominationPoolStatus$.pipe(filter((v) => v != null)),
  ]).pipe(
    map(([activeEra, eraDuration, pool]) => {
      const unlocks = pool.unlocks.map(({ era, value }) => ({
        value,
        unlocked: era <= activeEra.era,
        estimatedUnlock: new Date(
          Date.now() +
            Math.max(0, activeEra.estimatedEnd.getTime() - Date.now()) +
            (era - activeEra.era - 1) * eraDuration,
        ),
      }))
      return unlocks.sort(
        (a, b) => a.estimatedUnlock.getTime() - b.estimatedUnlock.getTime(),
      )
    }),
  ),
)

export const ManageLocks = () => {
  const locks = useStateObservable(locks$)
  const selectedAccount = useStateObservable(selectedSignerAccount$)

  return (
    <Locks
      locks={locks}
      createTx={async () => {
        const [api, slashingSpans] = await Promise.all([
          firstValueFrom(stakingApi$),
          firstValueFrom(slashingSpans$.pipe(filter((v) => v != null))),
        ])

        return api.tx.NominationPools.withdraw_unbonded({
          member_account: MultiAddress.Id(selectedAccount!.address),
          num_slashing_spans: slashingSpans,
        })
      }}
    />
  )
}
export const manageLocksSub$ = locks$.pipe(liftSuspense())
