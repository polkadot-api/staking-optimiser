import { activeEra$ } from "@/state/era";
import { state, useStateObservable } from "@react-rxjs/core";
import { Card } from "../Card";
import { CircularProgress } from "../CircularProgress";
import { combineLatest, switchMap } from "rxjs";
import { relayApi$, stakingApi$ } from "@/state/chain";
import { formatPercentage } from "@/util/format";

const staked$ = state(
  combineLatest({
    issuance: relayApi$.pipe(
      switchMap((v) => v.query.Balances.TotalIssuance.getValue())
    ),
    staked: combineLatest([stakingApi$, activeEra$]).pipe(
      switchMap(([api, activeEra]) =>
        api.query.Staking.ErasTotalStake.getValue(activeEra.era)
      )
    ),
  }),
  null
);

export const Staked = () => {
  const staked = useStateObservable(staked$);

  const pct = staked ? Number(staked.staked) / Number(staked.issuance) : null;

  return (
    <Card title="Staked" className="flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-chart-2">
        <CircularProgress
          progress={pct ?? 0}
          text={pct ? formatPercentage(pct) : ""}
        />
      </div>
    </Card>
  );
};
