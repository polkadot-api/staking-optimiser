import { stakingApi$ } from "@/state/chain"
import { activeEra$ } from "@/state/era"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { combineLatest, map, switchMap } from "rxjs"
import { Card } from "../Card"
import { CircularProgress } from "../CircularProgress"

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
    <Card title="Active Validators">
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
    </Card>
  )
}

export const TotalValidators = () => {
  const validators = useStateObservable(validators$)

  return (
    <Card title="Total Validators">
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
    </Card>
  )
}
