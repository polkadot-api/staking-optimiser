import { HISTORY_DEPTH as REWARD_HISTORY_DEPTH } from "@/constants";
import { accountStatus$, selectedAccountAddr$ } from "@/state/account";
import { amountToNumber, roundToDecimalPlaces } from "@/util/format";
import { state } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import {
  combineLatest,
  debounceTime,
  filter,
  map,
  mergeAll,
  mergeMap,
  pipe,
  scan,
  switchMap,
  withLatestFrom,
  type OperatorFunction,
} from "rxjs";
import { selectedChain$, stakingSdk$, tokenDecimals$ } from "./chain";
import { activeEraNumber$, allEras$, eraDurationInMs$, getEraApy } from "./era";
import { getNominatorRewards, getNominatorValidators } from "./nominatorInfo";

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
    switchMap(([addr, era]) => getNominatorRewards(addr, [era - 1])),
    map(
      (v) =>
        v.result ?? {
          total: 0n,
          totalCommission: 0n,
          activeBond: 0n,
        }
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

const accumulateChart = <T extends { era: number }>(): OperatorFunction<
  T | null,
  T[]
> =>
  pipe(
    withLatestFrom(activeEraNumber$),
    scan(
      (
        acc: {
          start: number;
          result: T[];
        },
        [value, era]
      ) => {
        if (!value) {
          return acc;
        }

        if (!acc.result.length) {
          acc.start = era;
          const idx = acc.start - 1 - value.era;
          acc.result[idx] = value;
          return acc;
        }

        if (era != acc.start) {
          // Era has changed, shift result
          return {
            start: era,
            result: [value, ...acc.result],
          };
        }
        const idx = acc.start - 1 - value.era;
        acc.result[idx] = value;

        return acc;
      },
      { start: 0, result: [] }
    ),
    map((v) => v.result)
  );

export const rewardHistory$ = state(
  combineLatest([
    selectedAccountAddr$,
    // Even though this is unused, we need to reset the state of the inner
    // observable when the chain changes
    selectedChain$,
  ]).pipe(
    switchMap(([addr]) =>
      addr
        ? allEras$(REWARD_HISTORY_DEPTH).pipe(
            mergeMap((eras) => getNominatorRewards(addr, eras)),
            withLatestFrom(tokenDecimals$),
            map(([v, decimals]) =>
              v.result
                ? {
                    era: v.era,
                    rewards: amountToNumber(v.result.total, decimals),
                  }
                : null
            ),
            accumulateChart(),
            debounceTime(100),
            // Exclude empty values
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
      getNominatorValidators(nominator, [activeEra])
    ),
    map((v) => v.result ?? [])
  )
);

export const validatorPerformance$ = state((addr: SS58String) => {
  const activeChart$ = combineLatest([
    selectedAccountAddr$.pipe(filter((v) => v != null)),
    selectedChain$,
  ]).pipe(
    switchMap(([nominator]) =>
      allEras$(REWARD_HISTORY_DEPTH).pipe(
        mergeMap((eras) => getNominatorValidators(nominator, eras)),
        map(({ era, result }) => ({
          era,
          isActive: result?.find((v) => v.validator === addr) != null || false,
        }))
      )
    ),
    accumulateChart()
  );
  const rewardChart$ = stakingSdk$.pipe(
    switchMap((stakingSdk) =>
      allEras$(REWARD_HISTORY_DEPTH).pipe(
        mergeAll(),
        mergeMap(
          async (era) => ({
            era,
            rewards: await stakingSdk.getValidatorRewards(addr, era),
          }),
          3
        ),
        withLatestFrom(eraDurationInMs$),
        map(([{ era, rewards }, eraDuration]) => ({
          era,
          apy: rewards
            ? getEraApy(
                rewards.nominatorsShare,
                rewards.activeBond,
                eraDuration
              ) * 100
            : null,
        })),
        accumulateChart()
      )
    )
  );

  return combineLatest([activeChart$, rewardChart$]).pipe(
    debounceTime(200),
    map(([activeChart, rewardChart]) =>
      activeChart.map((active, i) => ({
        ...active,
        apy: rewardChart[i]?.apy ?? null,
      }))
    ),
    map((v) => v.filter(() => true))
  );
});
