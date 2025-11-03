import { HISTORY_DEPTH, PERBILL } from "@/constants"
import type { ValidatorRewards as SdkValidatorRewards } from "@polkadot-api/sdk-staking"
import { state } from "@react-rxjs/core"
import type { SS58String } from "polkadot-api"
import {
  catchError,
  combineLatest,
  map,
  mergeAll,
  mergeMap,
  switchMap,
} from "rxjs"
import { stakingApi$, stakingSdk$ } from "./chain"
import { accumulateChart } from "./chart"
import { allEras$, eraDurationInMs$, getEraApy } from "./era"

export const registeredValidators$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.Staking.Validators.getEntries()),
    map((result) =>
      result.map(({ keyArgs: [address], value }) => ({
        address,
        preferences: { ...value, commission: value.commission / PERBILL },
      })),
    ),
  ),
)

export type ValidatorRewards = SdkValidatorRewards & {
  nominatorApy: number
  totalApy: number
}
export const validatorsEra$ = state((era: number) =>
  stakingSdk$.pipe(
    switchMap((stakingSdk) => stakingSdk.getEraValidators(era)),
    switchMap(({ validators }) =>
      eraDurationInMs$.pipe(
        map((duration) =>
          validators.map(
            (validator): ValidatorRewards => ({
              ...validator,
              nominatorApy: getEraApy(
                validator.nominatorsShare,
                validator.activeBond,
                duration,
              ),
              totalApy: getEraApy(
                validator.reward,
                validator.activeBond,
                duration,
              ),
            }),
          ),
        ),
      ),
    ),
    catchError((ex) => {
      // TODO Might happen when switching chain dot->ksm while in the dashboard
      console.error(ex)
      return [[]]
    }),
  ),
)

export const validatorPerformance$ = state((addr: SS58String) =>
  combineLatest([stakingSdk$, eraDurationInMs$]).pipe(
    switchMap(([stakingSdk, eraDuration]) =>
      allEras$(HISTORY_DEPTH).pipe(
        mergeAll(),
        mergeMap(
          async (era) => ({
            era,
            rewards: await stakingSdk.getValidatorRewards(addr, era),
          }),
          3,
        ),
        map(({ era, rewards }) => ({
          era,
          apy: rewards
            ? getEraApy(
                rewards.nominatorsShare,
                rewards.activeBond,
                eraDuration,
              ) * 100
            : null,
        })),
        accumulateChart(),
      ),
    ),
  ),
)
