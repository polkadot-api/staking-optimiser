import { relayApi$, stakingApi$ } from "@/state/chain";
import { state } from "@react-rxjs/core";
import {
  combineLatest,
  defer,
  distinctUntilChanged,
  map,
  merge,
  repeat,
  Subject,
  switchMap,
  take,
  timer,
} from "rxjs";

export const eraDurationInMs$ = state(
  combineLatest([
    relayApi$.pipe(
      switchMap((balancesApi) => balancesApi.constants.Babe.ExpectedBlockTime())
    ),
    relayApi$.pipe(
      switchMap((balancesApi) => balancesApi.constants.Babe.EpochDuration())
    ),
    stakingApi$.pipe(
      switchMap((stakingApi) => stakingApi.constants.Staking.SessionsPerEra())
    ),
  ]).pipe(
    map(
      ([blockTime, epochDuration, sessionsPerEra]) =>
        sessionsPerEra * Number(epochDuration) * Number(blockTime)
    ),
    distinctUntilChanged()
  )
);

export const unbondDurationInMs$ = state(
  combineLatest([
    eraDurationInMs$,
    stakingApi$.pipe(
      switchMap((api) => api.constants.Staking.BondingDuration())
    ),
  ]).pipe(
    map(([eraDuration, bondingDuration]) => eraDuration * bondingDuration)
  )
);

export function getEraApy(
  eraReward: bigint,
  invested: bigint,
  eraDurationInMs: number
) {
  if (invested === 0n) return 0;

  const erasInAYear = (365.24219 * 24 * 60 * 60 * 1000) / eraDurationInMs;

  const rewardPct = Number(eraReward) / Number(invested);
  return Math.pow(1 + rewardPct, erasInAYear) - 1;
}

// chopsticks stuff
export const refreshEra$ = new Subject<void>();
export const activeEra$ = state(
  combineLatest([
    stakingApi$.pipe(
      switchMap((stakingApi) =>
        defer(stakingApi.query.Staking.ActiveEra.getValue).pipe(
          // refresh every 10 minutes
          repeat({
            delay: () =>
              merge(refreshEra$, timer(10 * 60 * 1000)).pipe(take(1)),
          })
        )
      )
    ),
    eraDurationInMs$,
  ]).pipe(
    map(([v, eraDurationInMs]) => {
      const now = Date.now();

      const era = v?.index ?? 0;
      const eraStart = Number(v?.start ?? now);
      const currentEraTime = now - eraStart;

      const estimatedEnd = new Date(eraStart + eraDurationInMs);

      return {
        era,
        pctComplete: currentEraTime / eraDurationInMs,
        estimatedEnd,
      };
    })
  )
);

export const activeEraNumber$ = activeEra$.pipeState(
  map((v) => v.era),
  distinctUntilChanged()
);

export const currentEra$ = state(
  stakingApi$.pipe(
    switchMap((stakingApi) => stakingApi.query.Staking.CurrentEra.getValue()),
    map((v) => v ?? null)
  ),
  null
);

export const allEras$ = (pastAmount = Number.POSITIVE_INFINITY) =>
  stakingApi$.pipe(
    switchMap((stakingApi) => stakingApi.constants.Staking.HistoryDepth()),
    switchMap((historyDepth) => {
      const cappedDepth = Math.min(pastAmount, historyDepth);
      return activeEraNumber$.pipe(
        map((era, i) =>
          i === 0
            ? new Array(cappedDepth - 1).fill(0).map((_, i) => era - i - 1)
            : [era - 1]
        )
      );
    })
  );
