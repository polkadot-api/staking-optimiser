import { Card } from "@/components/Card";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { selectedAccountAddr$ } from "@/state/account";
import { stakingSdk, typedApi } from "@/state/chain";
import {
  activeEraNumber$,
  allEras$,
  eraDurationInMs$,
  getEraApy,
} from "@/state/era";
import { isNominating$ } from "@/state/nominate";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import { act, lazy, type FC } from "react";
import { filter, map, mergeMap, scan, switchMap, withLatestFrom } from "rxjs";

const EraChart = lazy(() => import("@/components/EraChart"));

export const Nominate = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <NominateContent />
      </Subscribe>
    </div>
  );
};

const NominateContent = () => {
  const isNominating = useStateObservable(isNominating$);

  return isNominating ? <NominatingContent /> : <NotNominatingContent />;
};

const NominatingContent = () => {
  return (
    <div>
      <SelectedValidators />
    </div>
  );
};

const selectedValidators$ = state(
  selectedAccountAddr$.pipe(
    switchMap((addr) => typedApi.query.Staking.Nominators.watchValue(addr)),
    map((v) => v?.targets ?? [])
  )
);

const HISTORY_DEPTH = 21;
const validatorPerformance$ = state((addr: SS58String) =>
  allEras$(HISTORY_DEPTH).pipe(
    mergeMap(async (era) => {
      try {
        const rewards = await stakingSdk.getValidatorRewards(addr, era);
        return {
          era,
          rewards: rewards.nominatorsShare,
          bond: rewards.activeBond,
          byNominator: rewards.byNominator,
        };
      } catch (ex) {
        console.error(ex);
        return null;
      }
    }, 3),
    filter((v) => v != null),
    withLatestFrom(eraDurationInMs$, selectedAccountAddr$),
    scan(
      (
        acc: Array<{
          era: number;
          isActive: boolean;
          apy: number;
        }>,
        [v, eraDuration, addr]
      ) => {
        let result = [
          ...acc,
          {
            era: v.era,
            apy: getEraApy(v.rewards, v.bond, eraDuration) * 100,
            isActive: addr in v.byNominator,
          },
        ];
        if (result.length > HISTORY_DEPTH) {
          result = result.slice(1);
        }
        result.sort((a, b) => a.era - b.era);
        return result;
      },
      []
    )
  )
);

const SelectedValidators = () => {
  const validators = useStateObservable(selectedValidators$);

  return (
    <Card title="Selected Validators">
      <ul>
        {validators.map((v) => (
          <li key={v}>
            <SelectedValidator validator={v} />
          </li>
        ))}
      </ul>
    </Card>
  );
};

const SelectedValidator: FC<{
  validator: SS58String;
}> = ({ validator }) => {
  const rewardHistory = useStateObservable(validatorPerformance$(validator));
  const activeEra = useStateObservable(activeEraNumber$);

  return (
    <div>
      <div>{validator}</div>
      <EraChart height={200} data={rewardHistory} activeEra={activeEra} />
    </div>
  );
};

const NotNominatingContent = () => {
  return "Not Nominating";
};
