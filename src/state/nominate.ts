import { HISTORY_DEPTH, TOKEN_PROPS } from "@/constants";
import { selectedAccountAddr$ } from "@/state/account";
import { stakingSdk, typedApi } from "@/state/chain";
import { roundToDecimalPlaces } from "@/util/format";
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
  takeWhile,
  withLatestFrom,
} from "rxjs";
import { activeEraNumber$, allEras$, eraDurationInMs$, getEraApy } from "./era";

export const currentNominatorBond$ = state(
  selectedAccountAddr$.pipe(
    switchMap((v) =>
      v
        ? typedApi.query.Staking.Bonded.watchValue(v).pipe(
            // Avoid watching a value that very rarely will change once set
            takeWhile((v) => v != null, true),
            switchMap((addr) =>
              addr ? typedApi.query.Staking.Ledger.watchValue(addr) : [null]
            )
          )
        : [null]
    ),
    map((v) => v ?? null)
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
    switchMap(([addr, era]) => stakingSdk.getNominatorRewards(addr, era - 1)),
    withLatestFrom(eraDurationInMs$),
    map(([rewards, eraDurationInMs]) => {
      const apy = roundToDecimalPlaces(
        getEraApy(rewards.total, rewards.activeBond, eraDurationInMs) * 100,
        2
      );

      return {
        total: rewards.total,
        apy,
      };
    })
  )
);

export const rewardHistory$ = state(
  combineLatest([
    selectedAccountAddr$,
    typedApi.constants.Staking.HistoryDepth(),
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
    switchMap(({ addr, era: startEra }) =>
      addr
        ? allEras$(HISTORY_DEPTH).pipe(
            mergeMap(async (era) => {
              try {
                const rewards = await stakingSdk.getNominatorRewards(addr, era);
                return {
                  era,
                  rewards: Number(rewards.total) / 10 ** TOKEN_PROPS.decimals,
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
