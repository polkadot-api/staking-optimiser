import { genericSort, type SortBy } from "@/components/SortBy";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import { activeEraNumber$ } from "@/state/era";
import {
  registeredValidators$,
  validatorsEra$,
  type ValidatorRewards,
} from "@/state/validators";
import { createState } from "@/util/rxjs";
import { state } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import type { SS58String } from "polkadot-api";
import {
  combineLatest,
  combineLatestWith,
  concat,
  distinct,
  map,
  mergeAll,
  mergeMap,
  scan,
  switchMap,
  take,
} from "rxjs";

export const [maPeriod$, setMaPeriod] = createState(1);
export const [maType$, setMaType] = createState<"simple" | "exponential">(
  "simple"
);

export const [eraChange$, setEra] = createSignal<number>();
export const selectedEra$ = state(
  // When changing network, re-fetch the current era
  stakingApi$.pipe(
    switchMap(() =>
      concat(
        activeEraNumber$.pipe(
          map((v) => v - 1),
          take(1)
        ),
        eraChange$
      )
    )
  )
);

const selectedEras$ = combineLatest([maPeriod$, selectedEra$]).pipe(
  map(([emaPeriod, selectedEra]) =>
    new Array(emaPeriod).fill(0).map((_, i) => selectedEra - i)
  )
);

export interface HistoricValidator {
  address: SS58String;
  commission: number;
  blocked: boolean;
  points: number;
  reward: bigint;
  commissionShare: bigint;
  nominatorsShare: bigint;
  activeBond: bigint;
  nominatorQuantity: number;
  nominatorApy: number;
  totalApy: number;
}

export interface PositionValidator extends HistoricValidator {
  position: number;
  selected: boolean;
}

const aggregateHistoricValidatorProp = <T extends keyof HistoricValidator>(
  validators: HistoricValidator[],
  key: T,
  maType: "exponential" | "simple"
): HistoricValidator[T] => {
  if (["address", "commission", "blocked"].includes(key)) {
    return validators[0][key];
  }

  if (maType === "simple") {
    let sum: any = validators[0][key];
    for (let i = 1; i < validators.length; i++) {
      sum += validators[i][key];
    }

    const amount =
      typeof sum === "bigint" ? BigInt(validators.length) : validators.length;

    return (sum / (amount as any)) as HistoricValidator[T];
  }

  let result = Number(validators[validators.length - 1][key]);
  const smoothing = 2 / (1 + validators.length);
  for (let i = validators.length - 2; i >= 0; i--) {
    result = Number(validators[i][key]) * smoothing + result * (1 - smoothing);
  }
  return (
    typeof validators[0][key] === "bigint" ? BigInt(Math.round(result)) : result
  ) as HistoricValidator[T];
};

const aggregateHistoricValidators = (
  validators: HistoricValidator[],
  maType: "exponential" | "simple"
): HistoricValidator => {
  if (validators.length === 1) return validators[0];

  return Object.fromEntries(
    Object.keys(validators[0]).map((key) => [
      key,
      aggregateHistoricValidatorProp(
        validators,
        key as keyof HistoricValidator,
        maType
      ),
    ])
  ) as any;
};

const validatorRewardsToHistoric = (
  validator: ValidatorRewards
): HistoricValidator => {
  return {
    ...validator,
    nominatorQuantity: validator.nominatorCount,
  };
};

const validatorHistory$ = stakingSdk$.pipe(
  // Reset on chain change
  switchMap(() =>
    selectedEras$.pipe(
      mergeAll(),
      distinct(),
      mergeMap(
        (era) =>
          validatorsEra$(era).pipe(
            map((validators) => ({ era, validators })),
            take(1)
          ),
        3
      ),
      scan(
        (acc, v) => {
          acc[v.era] = Object.fromEntries(
            v.validators.map((v) => [v.address, validatorRewardsToHistoric(v)])
          );
          return acc;
        },
        {} as Record<number, Record<string, HistoricValidator>>
      )
    )
  )
);

export const aggregatedValidators$ = combineLatest([
  validatorHistory$,
  selectedEra$,
  maPeriod$,
  maType$,
]).pipe(
  map(([history, era, period, maType]) => {
    // The selected era is what marks the validators to be aggregated.
    // The idea is to let the user move to previous eras, and move the ma along.
    // But what should be shown is always the validator set of that era, with their commission at that era, etc.
    if (!history[era] || period < 1) return null;

    const relevantHistory = new Array(period)
      .fill(0)
      .map((_, i) => history[era - i])
      .filter((v) => v != null);

    return Object.keys(relevantHistory[0]).map((address) =>
      aggregateHistoricValidators(
        relevantHistory
          .map((eraValidators) => eraValidators[address])
          .filter((v) => v != null),
        maType
      )
    );
  })
);

export const [filterBlocked$, setFilterBlocked] = createState(true);
export const [filterCommision$, setFilterCommission] = createState<number>(100);
export const [search$, setSearch] = createState("");

export const validatorPrefs$ = state(
  registeredValidators$.pipe(
    map((val) => Object.fromEntries(val.map((v) => [v.address, v.preferences])))
  ),
  {}
);

const filteredValidators$ = combineLatest([
  aggregatedValidators$,
  validatorPrefs$,
  filterBlocked$,
  filterCommision$,
]).pipe(
  map(([validators, registerdValidators, filterBlocked, filterCommission]) =>
    filterBlocked || filterCommission != null
      ? (validators?.filter((v) => {
          const prefs = registerdValidators[v.address];
          // We are in the branch that we have a filter blocked or commission.
          // Exclude validators that are not eligible to be nominated now (counts as blocked or commission 100%)
          if (!prefs) return false;

          if (filterBlocked && prefs.blocked) return false;
          if (prefs.commission > filterCommission / 100) return false;

          return true;
        }) ?? [])
      : (validators ?? [])
  )
);

export const [sortBy$, setSortBy] = createState<SortBy<HistoricValidator>>({
  prop: "nominatorApy",
  dir: "desc",
});

export const sortedValidators$ = state(
  combineLatest([filteredValidators$, sortBy$]).pipe(
    map(([validators, sortBy]) =>
      sortBy === null ? validators : [...validators].sort(genericSort(sortBy))
    ),
    combineLatestWith(search$),
    map(
      ([sorted, search]): Array<HistoricValidator & { position?: number }> =>
        search
          ? sorted
              .map((v, i) => ({ ...v, position: i }))
              .filter((v) =>
                v.address
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase())
              )
          : sorted
    )
  ),
  []
);
