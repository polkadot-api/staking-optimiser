import { TokenValue } from "@/components/TokenValue"
import { TransactionButton } from "@/components/Transactions"
import { selectedSignerAccount$ } from "@/state/account"
import { relayApi$, stakingApi$ } from "@/state/chain"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominatorBond$ } from "@/state/nominate"
import { estimatedFuture } from "@/util/date"
import { state, useStateObservable } from "@react-rxjs/core"
import { Clock } from "lucide-react"
import { combineLatest, filter, firstValueFrom, map, switchMap } from "rxjs"

const locks$ = state(
  combineLatest([
    activeEra$,
    eraDurationInMs$,
    currentNominatorBond$.pipe(filter((v) => v != null)),
  ]).pipe(
    map(([activeEra, eraDuration, bond]) => {
      const unlocks = bond.unlocks.map(({ era, value }) => ({
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

export const NominateLocks = () => {
  const locks = useStateObservable(locks$)
  const expired = locks.filter((x) => x.unlocked)
  const active = locks.filter((x) => !x.unlocked)

  return (
    <>
      {active.length > 0 && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-0.5">
              Active Unlocks
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {active.map(({ unlocked, estimatedUnlock, value }, index) => (
                <p
                  key={index}
                  className="text-sm text-amber-900 dark:text-amber-200"
                >
                  <span className="text-muted-foreground">
                    {unlocked ? "Unbonded" : estimatedFuture(estimatedUnlock)}:
                  </span>{" "}
                  <span className="font-semibold">
                    {<TokenValue value={value} />}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
      {expired.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Expired Unlocks
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {expired.map(({ unlocked, estimatedUnlock, value }, index) => (
                <p
                  key={index}
                  className="text-sm text-blue-900 dark:text-blue-200"
                >
                  <span className="text-muted-foreground">
                    {unlocked ? "Unbonded" : estimatedFuture(estimatedUnlock)}:
                  </span>{" "}
                  <span className="font-semibold">
                    {<TokenValue value={value} />}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <TransactionButton
            createTx={async () => {
              const [api, slashingSpans] = await Promise.all([
                firstValueFrom(stakingApi$),
                firstValueFrom(slashingSpans$.pipe(filter((v) => v != null))),
              ])

              return api.tx.Staking.withdraw_unbonded({
                num_slashing_spans: slashingSpans,
              })
            }}
            size="sm"
            variant="outline"
            className="flex-shrink-0 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 dark:bg-blue-600 dark:border-blue-600 dark:hover:bg-blue-700"
          >
            Unlock funds
          </TransactionButton>
        </div>
      )}
    </>
  )
}
export const nominateLocksSub$ = locks$

export const slashingSpans$ = state(
  // TODO verify it's actually on relay chain
  combineLatest([
    relayApi$,
    selectedSignerAccount$.pipe(filter((v) => v != null)),
  ]).pipe(
    switchMap(([api, account]) =>
      api.query.Staking.SlashingSpans.getValue(account?.address),
    ),
    map((r) => (r ? 1 + r.prior.length : 0)),
  ),
  null,
)
