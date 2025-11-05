import { stakingApi$ } from "@/state/chain"
import { activeEra$ } from "@/state/era"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { combineLatest, map, switchMap } from "rxjs"
import { CircularProgress } from "../CircularProgress"
import { InfoCard } from "./InfoCard"

const validators$ = stakingApi$.pipeState(
  switchMap((api) =>
    combineLatest({
      count: api.query.Staking.CounterForValidators.getValue(),
      active: activeEra$.pipe(
        switchMap((activeEra) =>
          api.query.Staking.ErasStakersOverview.getEntries(activeEra.era),
        ),
        map((stakers) => stakers.length),
      ),
      ideal: api.query.Staking.ValidatorCount.getValue(),
      max: api.query.Staking.MaxValidatorsCount.getValue(),
    }),
  ),
  withDefault(null),
)

export const ActiveValidators = () => {
  const validators = useStateObservable(validators$)

  return (
    <InfoCard
      title="Active Validators"
      tooltip="Validators currently participating in block production this era"
    >
      <div className="flex flex-col items-center">
        <div className="text-xs text-chart-2">
          <CircularProgress
            progress={validators ? validators.active / validators.ideal : 0}
          />
        </div>
        <div className="text-sm">
          {validators ? `${validators.ideal}/${validators.ideal}` : `…`}
        </div>
      </div>
    </InfoCard>
  )
}

export const TotalValidators = () => {
  const validators = useStateObservable(validators$)

  return (
    <InfoCard
      title="Total Validators"
      className="hidden lg:flex"
      tooltip="The total number of validator nodes registered on the network"
    >
      <div className="flex flex-col items-center">
        <div className="text-xs text-chart-2">
          <CircularProgress
            progress={validators?.max ? validators.count / validators.max : 0}
          />
        </div>
        <div className="text-sm">
          {validators?.max
            ? `${validators.count.toLocaleString()}/${validators.max.toLocaleString()}`
            : (validators?.count ?? `…`)}
        </div>
      </div>
    </InfoCard>
  )
}
