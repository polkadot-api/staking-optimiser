import { stakingApi$ } from "@/state/chain"
import { activeEra$ } from "@/state/era"
import { formatPercentage } from "@/util/format"
import { state, useStateObservable } from "@react-rxjs/core"
import { combineLatest, switchMap } from "rxjs"
import { CircularProgress } from "../CircularProgress"
import { InfoCard } from "./InfoCard"

const staked$ = state(
  combineLatest({
    issuance: stakingApi$.pipe(
      switchMap((v) => v.query.Balances.TotalIssuance.getValue()),
    ),
    staked: combineLatest([stakingApi$, activeEra$]).pipe(
      switchMap(([api, activeEra]) =>
        api.query.Staking.ErasTotalStake.getValue(activeEra.era),
      ),
    ),
  }),
  null,
)

export const Staked = () => {
  const staked = useStateObservable(staked$)

  const pct = staked ? Number(staked.staked) / Number(staked.issuance) : null

  return (
    <InfoCard title="Staked">
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-chart-2">
        <CircularProgress
          progress={pct ?? 0}
          text={pct ? formatPercentage(pct) : ""}
        />
      </div>
    </InfoCard>
  )
}
