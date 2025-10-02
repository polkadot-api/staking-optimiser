import { HISTORY_DEPTH } from "@/constants";
import { accountStatus$, selectedAccountAddr$ } from "@/state/account";
import { amountToNumber, roundToDecimalPlaces } from "@/util/format";
import { state } from "@react-rxjs/core";
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

export const currentNominatorBond$ = state(
  accountStatus$.pipe(
    map((v) => {
      if (!v || !v.nomination.currentBond) return null;

      return {
        bond: v.nomination.currentBond,
        active: v.nomination.activeBond,
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
    stakingSdk$,
  ]).pipe(
    switchMap(([addr, era, stakingSdk]) =>
      stakingSdk.getNominatorRewards(addr, era - 1)
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
    withLatestFrom(stakingSdk$, tokenDecimals$),
    switchMap(([{ addr, era: startEra }, stakingSdk, decimals]) =>
      addr
        ? allEras$(HISTORY_DEPTH).pipe(
            mergeMap(async (era) => {
              try {
                const rewards = await stakingSdk.getNominatorRewards(addr, era);
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
