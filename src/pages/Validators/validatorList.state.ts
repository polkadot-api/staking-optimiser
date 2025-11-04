import { genericSort, type SortBy } from "@/components/SortBy"
import { identitySdk$, stakingApi$, stakingSdk$ } from "@/state/chain"
import { activeEraNumber$ } from "@/state/era"
import {
  registeredValidators$,
  validatorsEra$,
  type ValidatorRewards,
} from "@/state/validators"
import { createState } from "@/util/rxjs"
import { getPublicKey } from "@/util/ss58"
import type { Identity } from "@polkadot-api/sdk-accounts"
import { state } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { Binary, type SS58String } from "polkadot-api"
import {
  combineLatest,
  concat,
  distinct,
  distinctUntilChanged,
  map,
  mergeAll,
  mergeMap,
  Observable,
  scan,
  startWith,
  switchMap,
  take,
  withLatestFrom,
  type MonoTypeOperatorFunction,
} from "rxjs"

export const [eraPeriodChange$, setEraAndPeriod] = createSignal<{
  era: number
  period: number
}>()

export const [maType$, setMaType] = createState<"simple" | "exponential">(
  "simple",
)

export const selectedEraAndPeriod$ = state(
  // When changing network, re-fetch the current era
  stakingApi$.pipe(
    switchMap(() =>
      concat(
        activeEraNumber$.pipe(
          map((v) => v - 1),
          take(1),
          map((era) => ({ era, period: 2 })),
        ),
        eraPeriodChange$,
      ).pipe(
        distinctUntilChanged(
          (a, b) => a.era === b.era && a.period === b.period,
        ),
      ),
    ),
  ),
)

const selectedEras$ = selectedEraAndPeriod$.pipe(
  map(({ era, period }) => new Array(period).fill(0).map((_, i) => era - i)),
)

export interface HistoricValidator {
  address: SS58String
  commission: number
  blocked: boolean
  points: number
  activeBond: bigint
  nominatorQuantity: number
  nominatorApy: number
  totalApy: number
  active: number
}

export interface PositionValidator extends HistoricValidator {
  position: number
  selected: boolean
}

const aggregateHistoricValidatorProp = <T extends keyof HistoricValidator>(
  validators: HistoricValidator[],
  key: T,
  maType: "exponential" | "simple",
): HistoricValidator[T] => {
  if (["address", "commission", "blocked"].includes(key)) {
    return validators[0][key]
  }

  if (maType === "simple") {
    // This works whether the type is a number or a bigint
    let sum: any = validators[0][key]
    for (let i = 1; i < validators.length; i++) {
      sum += validators[i][key]
    }

    const amount =
      typeof sum === "bigint" ? BigInt(validators.length) : validators.length

    return (sum / (amount as any)) as HistoricValidator[T]
  }

  let result = Number(validators[validators.length - 1][key])
  const smoothing = 2 / (1 + validators.length)
  for (let i = validators.length - 2; i >= 0; i--) {
    result = Number(validators[i][key]) * smoothing + result * (1 - smoothing)
  }
  return (
    typeof validators[0][key] === "bigint" ? BigInt(Math.round(result)) : result
  ) as HistoricValidator[T]
}

const aggregateHistoricValidators = (
  validators: HistoricValidator[],
  maType: "exponential" | "simple",
): HistoricValidator => {
  if (validators.length === 1) return validators[0]

  return Object.fromEntries(
    Object.keys(validators[0]).map((key) => [
      key,
      aggregateHistoricValidatorProp(
        validators,
        key as keyof HistoricValidator,
        maType,
      ),
    ]),
  ) as any
}

export const validatorRewardsToHistoric = (
  validator: ValidatorRewards,
): HistoricValidator => {
  return {
    ...validator,
    nominatorQuantity: validator.nominatorCount,
    active: 1,
  }
}

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
            take(1),
          ),
        3,
      ),
      scan(
        (acc, v) => {
          acc[v.era] = Object.fromEntries(
            v.validators.map((v) => [v.address, validatorRewardsToHistoric(v)]),
          )
          return acc
        },
        {} as Record<number, Record<string, HistoricValidator>>,
      ),
    ),
  ),
)

export const percentLoaded$ = state(
  validatorHistory$.pipe(
    withLatestFrom(selectedEras$),
    map(([hist, sel]) => sel.filter((x) => hist[x]).length / sel.length),
  ),
  0,
)

// Only fetching for the current era
const validatorIdentities$ = activeEraNumber$.pipe(
  switchMap((era) => validatorsEra$(era - 1)),
  withLatestFrom(identitySdk$),
  switchMap(([validators, identitySdk]) =>
    identitySdk.getIdentities(validators.map((v) => v.address)),
  ),
  startWith({} as Record<SS58String, Identity | null>),
)

export const aggregatedValidators$ = combineLatest([
  validatorHistory$,
  selectedEraAndPeriod$,
  maType$,
]).pipe(
  map(([history, { era, period }, maType]) => {
    if (period < 1) return null

    const relevantHistory = new Array(period)
      .fill(0)
      .map((_, i) => history[era - i])
      .filter((v) => v != null)

    if (!relevantHistory.length) return null

    // We have to invert the Array<Record<addr -> validator>> to Record<addr -> Array<validator>>
    // I.e. the array of validators per each era, to a record of the performance of that validator at each era.
    const allValidators: Record<SS58String, HistoricValidator[]> = {}
    relevantHistory.forEach((eraValidators) => {
      Object.entries(eraValidators).forEach(
        ([addr, eraValidatorPerformance]) => {
          allValidators[addr] ??= []
          allValidators[addr].push(eraValidatorPerformance)
        },
      )
    })

    return Object.values(allValidators).map((validatorPerformance) => {
      const aggregated = aggregateHistoricValidators(
        validatorPerformance,
        maType,
      )
      // whether it was active has to be done separately, as `aggregateHistoricValidators` only takes non-null dataPoints.
      // TODO refactor this, because now we can't support EMA for `active`.
      aggregated.active = validatorPerformance.length / relevantHistory.length
      return aggregated
    })
  }),
)

export const [filterBlocked$, setFilterBlocked] = createState(true)
export const [filterCommision$, setFilterCommission] = createState<number>(15)
export const [search$, setSearch] = createState("")

export const validatorPrefs$ = state(
  registeredValidators$.pipe(
    map((val) =>
      Object.fromEntries(val.map((v) => [v.address, v.preferences])),
    ),
  ),
  {},
)

const filteredValidators$ = combineLatest([
  aggregatedValidators$,
  validatorPrefs$,
  filterBlocked$,
  filterCommision$,
]).pipe(
  map(([validators, registerdValidators, filterBlocked, filterCommission]) => {
    if ((!filterBlocked && filterCommission == null) || !validators)
      return validators ?? []

    return validators.filter((v) => {
      const prefs = registerdValidators[v.address]
      // We are in the branch that we have a filter blocked or commission.
      // Exclude validators that are not eligible to be nominated now (counts as blocked or commission 100%)
      if (!prefs || (filterBlocked && prefs.blocked)) return false
      return filterCommission / 100 > prefs.commission
    })
  }),
)

export const [sortBy$, setSortBy] = createState<SortBy<HistoricValidator>>({
  prop: "nominatorApy",
  dir: "desc",
})

export const withSearch =
  (
    search$: Observable<string>,
  ): MonoTypeOperatorFunction<(HistoricValidator & { position?: number })[]> =>
  (source$) =>
    combineLatest([source$, search$, validatorIdentities$]).pipe(
      map(([sorted, search, identities]) => {
        if (!search.trim()) return sorted

        let searchPk = ""
        const ss58ToHex = (ss58: string) =>
          Binary.fromBytes(getPublicKey(ss58)).asHex()
        try {
          searchPk = ss58ToHex(search)
        } catch (ex) {
          /* empty */
        }

        return sorted
          .map((v, i) => ({ ...v, position: i }))
          .filter((v) => {
            const identity = identities[v.address]
            if (
              identity?.info.display
                ?.toLocaleLowerCase()
                .includes(search.toLocaleLowerCase())
            ) {
              return true
            }

            // Try for an SS58 match
            try {
              if (searchPk === ss58ToHex(v.address)) {
                return true
              }
            } catch (ex) {
              /* empty */
            }

            return false
          })
      }),
    )

export const sortedValidators$ = state(
  combineLatest([filteredValidators$, sortBy$]).pipe(
    map(([validators, sortBy]) =>
      sortBy === null ? validators : [...validators].sort(genericSort(sortBy)),
    ),
    // this "search" filter is different: It must happen after sorting because we
    // want to keep the original position (so that the user can look for validator
    // X and it will show that it's in 15th position instead of #1)
    withSearch(search$),
  ),
  [],
)
