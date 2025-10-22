import { HISTORY_DEPTH } from "@/constants";
import { accountStatus$, selectedAccountAddr$ } from "@/state/account";
import { amountToNumber, roundToDecimalPlaces } from "@/util/format";
import { state } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
  combineLatest,
  filter,
  map,
  mergeMap,
  scan,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs";
import { stakingApi$, stakingSdk$, tokenDecimals$ } from "./chain";
import { activeEraNumber$, allEras$, eraDurationInMs$, getEraApy } from "./era";
import { requestNominator } from "./nominatorInfo";
import type {
  NominatorRewardsResult,
  NominatorValidatorsResult,
} from "./rewards.worker";

export const currentNominatorBond$ = state(
  accountStatus$.pipe(
    map((v) => {
      if (!v || !v.nomination.totalLocked) return null;

      return {
        bond: v.nomination.currentBond,
        unlocks: v.nomination.unlocks,
      };
    })
  )
);

export const isNominating$ = currentNominatorBond$.pipeState(
  map((v) => v !== null)
);

export const lastReward$ = state(
  combineLatest([
    selectedAccountAddr$.pipe(filter((v) => v != null)),
    activeEraNumber$,
  ]).pipe(
    switchMap(([addr, era]) =>
      requestNominator<NominatorRewardsResult>({
        type: "getNominatorRewards",
        value: {
          address: addr,
          era: era - 1,
        },
      })
    ),
    withLatestFrom(eraDurationInMs$),
    map(([{ total, totalCommission, activeBond }, eraDurationInMs]) => {
      const apy = roundToDecimalPlaces(
        getEraApy(total, activeBond, eraDurationInMs) * 100,
        2
      );

      return {
        total,
        totalCommission,
        apy,
      };
    })
  )
);

export const rewardHistory$ = state(
  combineLatest([
    selectedAccountAddr$,
    stakingApi$.pipe(map((v) => v.constants.Staking.HistoryDepth())),
  ]).pipe(
    switchMap(([addr]) =>
      activeEraNumber$.pipe(
        take(1),
        map((era) => ({
          era,
          addr,
        }))
      )
    ),
    withLatestFrom(tokenDecimals$),
    switchMap(([{ addr, era: startEra }, decimals]) =>
      addr
        ? allEras$(HISTORY_DEPTH).pipe(
            mergeMap(async (era) => {
              try {
                const rewards = await requestNominator<NominatorRewardsResult>({
                  type: "getNominatorRewards",
                  value: {
                    address: addr,
                    era: era,
                  },
                });
                return {
                  era,
                  rewards: amountToNumber(rewards.total, decimals),
                };
              } catch (ex) {
                console.error(ex);
                return null;
              }
            }, 3),
            scan((acc, v) => {
              if (!v) return acc;

              const idx = startEra - 1 - v.era;
              const newValue = [...acc];
              newValue[idx] = v;
              if (newValue.length > HISTORY_DEPTH) {
                return newValue.slice(1);
              }
              return newValue;
            }, new Array<{ era: number; rewards: number }>()),
            startWith([]),
            map((v) => v.filter((v) => !!v))
          )
        : [[]]
    )
  ),
  []
);

export const currentNominatorStatus$ = state(
  combineLatest([
    selectedAccountAddr$.pipe(filter((v) => v != null)),
    activeEraNumber$,
  ]).pipe(
    switchMap(([nominator, activeEra]) =>
      requestNominator<NominatorValidatorsResult>({
        type: "getNominatorActiveValidators",
        value: {
          address: nominator,
          era: activeEra,
        },
      })
    )
  )
);

export const validatorPerformance$ = state((addr: SS58String) =>
  stakingSdk$.pipe(
    switchMap((stakingSdk) =>
      allEras$(HISTORY_DEPTH).pipe(
        withLatestFrom(selectedAccountAddr$.pipe(filter((v) => v != null))),
        mergeMap(async ([era, nominator]) => {
          try {
            const [rewards, nominatorStatus] = await Promise.all([
              stakingSdk.getValidatorRewards(addr, era),
              requestNominator<NominatorValidatorsResult>({
                type: "getNominatorActiveValidators",
                value: {
                  address: nominator,
                  era,
                },
              }),
            ]);
            return {
              era,
              rewards,
              isActive: !!nominatorStatus.find((v) => v.validator === addr),
            };
          } catch (ex) {
            console.error(ex);
            return { era, rewards: null, isActive: false };
          }
        }, 3),
        withLatestFrom(eraDurationInMs$),
        scan(
          (
            acc: Array<{
              era: number;
              isActive: boolean;
              apy: number | null;
            }>,
            [v, eraDuration]
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
                isActive: v.isActive,
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
