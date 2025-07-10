import { typedApi } from "@/state/chain";
import { state } from "@react-rxjs/core";
import {
  combineLatest,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  from,
  map,
  repeat,
  switchMap,
  take,
} from "rxjs";

export const eraDurationInMs$ = combineLatest([
  defer(() => typedApi.constants.Babe.ExpectedBlockTime()),
  defer(() => typedApi.constants.Babe.EpochDuration()),
  defer(() => typedApi.constants.Staking.SessionsPerEra()),
]).pipe(
  map(
    ([blockTime, epochDuration, sessionsPerEra]) =>
      sessionsPerEra * Number(epochDuration) * Number(blockTime)
  )
);

export function getEraApy(
  eraReward: bigint,
  invested: bigint,
  eraDurationInMs: number
) {
  if (invested === 0n) return 0;

  const erasInAYear = (365.25 * 24 * 60 * 60 * 1000) / Number(eraDurationInMs);

  const rewardPct = Number(eraReward) / Number(invested);
  return Math.pow(1 + rewardPct, erasInAYear) - 1;
}

export const activeEra$ = state(
  combineLatest([
    defer(typedApi.query.Staking.ActiveEra.getValue),
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
    }),
    // refresh every 10 minutes
    repeat({
      delay: 10 * 60 * 1000,
    })
  )
);

export const activeEraNumber$ = activeEra$.pipeState(
  map((v) => v.era),
  distinctUntilChanged()
);

/**
 * Observable that emits all eras, starting from the current one backwards
 * but then emitting new eras as they happen.
 */
export const allEras$ = (pastAmount = Number.POSITIVE_INFINITY) =>
  defer(typedApi.constants.Staking.HistoryDepth).pipe(
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
