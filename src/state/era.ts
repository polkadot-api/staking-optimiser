import { balancesApi$, stakingApi$ } from "@/state/chain";
import { state } from "@react-rxjs/core";
import {
  combineLatest,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  from,
  map,
  merge,
  repeat,
  Subject,
  switchMap,
  take,
  timer,
} from "rxjs";

export const eraDurationInMs$ = combineLatest([
  balancesApi$.pipe(
    switchMap((balancesApi) => balancesApi.constants.Babe.ExpectedBlockTime())
  ),
  balancesApi$.pipe(
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

/**
 * Observable that emits all eras, starting from the last completed one backwards
 * but then emitting new eras as they happen.
 */
export const allEras$ = (pastAmount = Number.POSITIVE_INFINITY) =>
  stakingApi$
    .pipe(
      switchMap((stakingApi) => stakingApi.constants.Staking.HistoryDepth())
    )
    .pipe(
      switchMap((historyDepth) =>
        activeEraNumber$.pipe(
          take(1),
          map((era) => ({
            era,
            historyDepth: Math.min(pastAmount, historyDepth),
          }))
        )
      ),
      switchMap(({ era: startEra, historyDepth }) =>
        concat(
          from(
            new Array(historyDepth - 1).fill(0).map((_, i) => startEra - i - 1)
          ),
          activeEraNumber$.pipe(
            filter((newEra) => newEra > startEra),
            map((v) => v - 1)
          )
        )
      )
    );
