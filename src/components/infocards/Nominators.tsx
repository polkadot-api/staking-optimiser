import { stakingApi$ } from "@/state/chain";
import { useStateObservable, withDefault } from "@react-rxjs/core";
import { combineLatest, switchMap } from "rxjs";
import { Card } from "../Card";
import { CircularProgress } from "../CircularProgress";

const validators$ = stakingApi$.pipeState(
  switchMap((api) =>
    combineLatest({
      count: api.query.Staking.CounterForNominators.getValue(),
      max: api.query.Staking.MaxNominatorsCount.getValue(),
    })
  ),
  withDefault(null)
);

export const ActiveNominators = () => {
  const nominators = useStateObservable(validators$);

  return (
    <Card title="Nominators">
      <div className="flex flex-col items-center">
        <div className="text-xs text-chart-2">
          <CircularProgress
            progress={nominators?.max ? nominators.count / nominators.max : 0}
          />
        </div>
        <div className="text-sm">
          {nominators?.max
            ? `${nominators.count}/${nominators.max}`
            : (nominators?.count ?? `…`)}
        </div>
      </div>
    </Card>
  );
};
