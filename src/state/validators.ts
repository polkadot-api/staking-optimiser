import type { ValidatorRewards as SdkValidatorRewards } from "@polkadot-api/sdk-staking";
import { state } from "@react-rxjs/core";
import { map, switchMap } from "rxjs";
import { stakingApi$, stakingSdk$ } from "./chain";
import { eraDurationInMs$, getEraApy } from "./era";

export const registeredValidators$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.Staking.Validators.getEntries()),
    map((result) =>
      result.map(({ keyArgs: [address], value }) => ({
        address,
        preferences: value,
      }))
    )
  )
);

export type ValidatorRewards = SdkValidatorRewards & {
  nominatorApy: number;
  totalApy: number;
};
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
                duration
              ),
              totalApy: getEraApy(
                validator.reward,
                validator.activeBond,
                duration
              ),
            })
          )
        )
      )
    )
  )
);
