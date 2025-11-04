import { HISTORY_DEPTH as REWARD_HISTORY_DEPTH } from "@/constants"
import { accountStatus$, selectedAccountAddr$ } from "@/state/account"
import { amountToNumber } from "@/util/format"
import { state } from "@react-rxjs/core"
import type { SS58String } from "polkadot-api"
import {
  combineLatest,
  debounceTime,
  filter,
  map,
  mergeMap,
  switchMap,
  withLatestFrom,
} from "rxjs"
import { selectedChain$, tokenDecimals$ } from "./chain"
import { accumulateChart } from "./chart"
import { activeEraNumber$, allEras$, eraDurationInMs$, getEraApy } from "./era"
import { getNominatorRewards, getNominatorValidators } from "./nominatorInfo"

export const currentNominatorBond$ = state(
  accountStatus$.pipe(
    map((v) => {
      if (!v || !v.nomination.totalLocked) return null

      return {
        bond: v.nomination.currentBond,
        unlocks: v.nomination.unlocks,
      }
    }),
  ),
)

export const isNominating$ = currentNominatorBond$.pipeState(
  map((v) => v !== null),
)

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
        },
    ),
    withLatestFrom(eraDurationInMs$),
    map(([{ total, totalCommission, activeBond }, eraDurationInMs]) => ({
      total,
      totalCommission,
      apy: getEraApy(total, activeBond, eraDurationInMs),
    })),
  ),
)

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
                : null,
            ),
            accumulateChart(),
            debounceTime(100),
            // Exclude empty values
            map((v) => v.filter((v) => !!v)),
          )
        : [[]],
    ),
  ),
  [],
)

export const currentNominatorStatus$ = state(
  combineLatest([
    selectedAccountAddr$.pipe(filter((v) => v != null)),
    activeEraNumber$,
  ]).pipe(
    switchMap(([nominator, activeEra]) =>
      getNominatorValidators(nominator, [activeEra]),
    ),
    map((v) => v.result ?? []),
  ),
)

export const validatorActive$ = state((addr: SS58String) =>
  combineLatest([
    selectedAccountAddr$.pipe(filter((v) => v != null)),
    selectedChain$,
  ]).pipe(
    switchMap(([nominator]) =>
      allEras$(REWARD_HISTORY_DEPTH).pipe(
        mergeMap((eras) => getNominatorValidators(nominator, eras)),
        map(({ era, result }) => ({
          era,
          isActive: result?.find((v) => v.validator === addr) != null || false,
        })),
        accumulateChart(),
      ),
    ),
  ),
)
