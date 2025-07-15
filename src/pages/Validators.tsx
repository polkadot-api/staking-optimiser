import { AddressIdentity } from "@/components/AddressIdentity";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { TokenValue } from "@/components/TokenValue";
import { stakingApi$, stakingSdk$ } from "@/state/chain";
import { activeEraNumber$ } from "@/state/era";
import {
  registeredValidators$,
  validatorsEra$,
  type ValidatorRewards,
} from "@/state/validators";
import { createState } from "@/util/rxjs";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import type { SS58String } from "polkadot-api";
import {
  combineLatest,
  concat,
  distinct,
  map,
  mergeAll,
  mergeMap,
  scan,
  switchMap,
  take,
} from "rxjs";

const [maPeriod$, setMaPeriod] = createState(1);
const [maType$, setMaType] = createState<"simple" | "exponential">("simple");

const [eraChange$, setEra] = createSignal<number>();
const selectedEra$ = state(
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

interface HistoricValidator {
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
const dummy: HistoricValidator = {
  activeBond: 0n,
  address: "",
  blocked: true,
  commission: 0,
  commissionShare: 0n,
  nominatorApy: 0,
  nominatorQuantity: 0,
  nominatorsShare: 0n,
  points: 0,
  reward: 0n,
  totalApy: 0,
};

const aggregateHistoricValidatorProp = <T extends keyof HistoricValidator>(
  validators: HistoricValidator[],
  key: T,
  maType: "exponential" | "simple"
): HistoricValidator[T] => {
  if (["address", "commission", "blocked"].includes(key)) {
    return validators[0][key];
  }

  let sum: any = validators[0][key];
  for (let i = 1; i < validators.length; i++) {
    sum += validators[i][key];
  }

  const amount =
    typeof sum === "bigint" ? BigInt(validators.length) : validators.length;

  return (sum / (amount as any)) as HistoricValidator[T];
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

const aggregatedValidators$ = combineLatest([
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

const [filterBlocked$, setFilterBlocked] = createState(false);
const [filterCommision$, setFilterCommission] = createState<number | null>(
  null
);

const validatorPrefs$ = state(
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
          if (filterCommission != null && prefs.commission >= filterCommission)
            return false;

          return true;
        }) ?? [])
      : (validators ?? [])
  )
);

const [sortBy$, setSortBy] = createState<{
  prop: keyof HistoricValidator;
  dir: "asc" | "desc";
}>({
  prop: "totalApy",
  dir: "desc",
});

const sortedValidators$ = state(
  combineLatest([filteredValidators$, sortBy$]).pipe(
    map(([validators, sortBy]) =>
      sortBy === null
        ? validators
        : [...validators].sort((a, b) => {
            const aValue = a[sortBy.prop];
            const bValue: any = b[sortBy.prop];
            const value = (() => {
              switch (typeof aValue) {
                case "bigint":
                  return Number(aValue - bValue);
                case "number":
                  return aValue - bValue;
                case "string":
                  return aValue.localeCompare(bValue);
                case "boolean":
                  return (aValue ? 1 : 0) - (bValue ? 1 : 0);
              }
              return 0;
            })();

            return sortBy.dir === "asc" ? value : -value;
          })
    )
  )
);

export const Validators = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <SortBy />
        <MaParams />
        <ValidatorList />
      </Subscribe>
    </div>
  );
};

const MaParams = () => {
  const period = useStateObservable(maPeriod$);
  const activeEraNumber = useStateObservable(activeEraNumber$);
  const selectedEra = useStateObservable(selectedEra$);

  return (
    <div>
      <label>
        Era
        <input
          type="range"
          min={activeEraNumber - 21}
          max={activeEraNumber - 1}
          step={1}
          value={selectedEra}
          onChange={(evt) => setEra(evt.target.valueAsNumber)}
        />
        {selectedEra}
      </label>
      <label>
        Period
        <input
          type="range"
          min={1}
          max={21}
          step={1}
          value={period}
          onChange={(evt) => setMaPeriod(evt.target.valueAsNumber)}
        />
        {period}
      </label>
    </div>
  );
};

const SortBy = () => {
  const sortBy = useStateObservable(sortBy$);

  return (
    <div>
      <label>
        Asc
        <input
          type="checkbox"
          checked={sortBy.dir === "asc"}
          onChange={() =>
            setSortBy({
              ...sortBy,
              dir: sortBy.dir === "asc" ? "desc" : "asc",
            })
          }
        />
      </label>
      <select
        value={sortBy.prop}
        onChange={(evt) =>
          setSortBy({
            ...sortBy,
            prop: evt.target.value as any,
          })
        }
      >
        {Object.keys(dummy).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
};

const ValidatorList = () => {
  const prefs = useStateObservable(validatorPrefs$);
  const validators = useStateObservable(sortedValidators$);

  return (
    <ol>
      {validators.slice(0, 10).map((v) => {
        const vPrefs = prefs[v.address];

        return (
          <li key={v.address}>
            <AddressIdentity addr={v.address} />
            <div>APY: {(v.nominatorApy * 100).toLocaleString()}%</div>
            <div>Total APY: {(v.totalApy * 100).toLocaleString()}%</div>
            {vPrefs ? (
              <>
                {vPrefs.blocked ? <div>Currently blocked</div> : null}
                <div>
                  Current commission:{" "}
                  {(vPrefs.commission * 100).toLocaleString()}%
                </div>
              </>
            ) : (
              <div>Not a currently-registered nominator</div>
            )}
            <div>
              Reward: <TokenValue value={v.reward} />
            </div>
            <div>
              Commission share: <TokenValue value={v.commissionShare} />
            </div>
            <div>
              Nominators share: <TokenValue value={v.nominatorsShare} />
            </div>
            <div>
              Active bond: <TokenValue value={v.activeBond} />
            </div>
            <div>
              Active nominator amount: {v.nominatorQuantity.toLocaleString()}
            </div>
            <div>Points: {v.points.toLocaleString()}</div>
          </li>
        );
      })}
    </ol>
  );
};
