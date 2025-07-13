import { AccountBalance } from "@/components/AccountBalance";
import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { selectedAccountAddr$ } from "@/state/account";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import {
  activeEraNumber$,
  allEras$,
  eraDurationInMs$,
  getEraApy,
} from "@/state/era";
import { isNominating$ } from "@/state/nominate";
import { roundToDecimalPlaces } from "@/util/format";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { type SS58String } from "polkadot-api";
import { lazy, type FC } from "react";
import {
  combineLatest,
  filter,
  map,
  mergeMap,
  scan,
  switchMap,
  withLatestFrom,
} from "rxjs";

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
    <div className="space-y-4">
      <BalanceCard />
      <SelectedValidators />
    </div>
  );
};

const BalanceCard = () => (
  <Card title="Balance">
    <AccountBalance />
  </Card>
);

const selectedValidators$ = state(
  combineLatest([selectedAccountAddr$, stakingApi$]).pipe(
    switchMap(([addr, stakingApi]) =>
      addr ? stakingApi.query.Staking.Nominators.watchValue(addr) : [null]
    ),
    map((v) => v?.targets ?? [])
  )
);

const HISTORY_DEPTH = 21;
const validatorPrefs$ = state((addr: SS58String) =>
  combineLatest([activeEraNumber$, stakingApi$]).pipe(
    switchMap(([era, stakingApi]) =>
      stakingApi.query.Staking.ErasValidatorPrefs.getValue(era, addr)
    )
  )
);

const validatorPerformance$ = state((addr: SS58String) =>
  stakingSdk$.pipe(
    switchMap((stakingSdk) =>
      allEras$(HISTORY_DEPTH).pipe(
        mergeMap(async (era) => {
          try {
            const rewards = await stakingSdk.getValidatorRewards(addr, era);
            return { era, rewards };
          } catch (ex) {
            console.error(ex);
            return { era, rewards: null };
          }
        }, 3),
        withLatestFrom(
          eraDurationInMs$,
          selectedAccountAddr$.pipe(filter((v) => v != null))
        ),
        scan(
          (
            acc: Array<{
              era: number;
              isActive: boolean;
              apy: number | null;
            }>,
            [v, eraDuration, nominatorAddr]
          ) => {
            let result = [
              ...acc,
              {
                era: v.era,
                apy: v.rewards
                  ? getEraApy(
                      v.rewards.nominatorsShare,
                      v.rewards.activeBond,
                      eraDuration
                    ) * 100
                  : null,
                isActive: v.rewards
                  ? nominatorAddr in v.rewards.byNominator
                  : false,
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
    )
  )
);

const SelectedValidators = () => {
  const validators = useStateObservable(selectedValidators$);

  return (
    <Card title="Selected Validators">
      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2">
        {validators.map((v) => (
          <li className="bg-secondary rounded p-2" key={v}>
            <SelectedValidator validator={v} />
          </li>
        ))}
      </ul>
    </Card>
  );
};

const PERBILL = 1000000000;
const SelectedValidator: FC<{
  validator: SS58String;
}> = ({ validator }) => {
  const rewardHistory = useStateObservable(validatorPerformance$(validator));
  const prefs = useStateObservable(validatorPrefs$(validator));
  const activeEra = useStateObservable(activeEraNumber$);

  const averageApy = rewardHistory.length
    ? roundToDecimalPlaces(
        rewardHistory
          .map((v) => v.apy)
          .filter((v) => v != null)
          .reduce((a, b) => a + b, 0) / rewardHistory.length,
        2
      )
    : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <AddressIdentity addr={validator} />
        {averageApy || prefs.commission ? (
          <div className="text-muted-foreground text-sm">
            {averageApy ? (
              <div>
                Avg APY: <b className="text-foreground">{averageApy}%</b>
              </div>
            ) : null}
            {prefs.commission ? (
              <div>
                Commission:{" "}
                <b className="text-foreground">
                  {roundToDecimalPlaces(
                    100 * Number(prefs.commission / PERBILL),
                    2
                  )}
                  %
                </b>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <EraChart height={200} data={rewardHistory} activeEra={activeEra} />
    </div>
  );
};

const NotNominatingContent = () => {
  return "Not Nominating";
};
