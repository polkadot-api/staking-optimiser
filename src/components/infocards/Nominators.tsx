import { stakingApi$ } from "@/state/chain"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { combineLatest, switchMap } from "rxjs"
import { CircularProgress } from "../CircularProgress"
import { InfoCard } from "./InfoCard"

const validators$ = stakingApi$.pipeState(
  switchMap((api) =>
    combineLatest({
      count: api.query.Staking.CounterForNominators.getValue(),
      max: api.query.Staking.MaxNominatorsCount.getValue(),
    }),
  ),
  withDefault(null),
)

export const ActiveNominators = () => {
  const nominators = useStateObservable(validators$)

  return (
    <InfoCard
      title="Nominators"
      className="hidden sm:flex"
      tooltip="Accounts that have staked DOT to back validators and share in their rewards"
    >
      <div className="flex flex-col items-center">
        <div className="text-xs text-chart-2">
          <CircularProgress
            progress={nominators?.max ? nominators.count / nominators.max : 0}
          />
        </div>
        <div className="text-sm">
          {nominators?.max
            ? `${nominators.count.toLocaleString()}/${nominators.max.toLocaleString()}`
            : (nominators?.count.toLocaleString() ?? `…`)}
        </div>
      </div>
    </InfoCard>
  )
}
