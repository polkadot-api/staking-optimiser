import { genericSort, type SortBy } from "@/components/SortBy"
import { selectedAccountAddr$ } from "@/state/account"
import { stakingApi$ } from "@/state/chain"
import { createState } from "@/util/rxjs"
import { state } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { type SS58String } from "polkadot-api"
import { combineLatest, filter, map, scan, startWith, switchMap } from "rxjs"
import {
  aggregatedValidators$,
  validatorPrefs$,
  withSearch,
  type HistoricValidator,
} from "../../Validators/validatorList.state"

export const MAX_VALIDATORS = 16

export const onChainSelectedValidators$ = state(
  combineLatest([
    stakingApi$,
    selectedAccountAddr$.pipe(filter((v) => v != null)),
  ]).pipe(
    switchMap(([api, addr]) => api.query.Staking.Nominators.watchValue(addr)),
    map((v) => v?.targets ?? []),
  ),
)

export const [toggleValidator$, toggleValidator] = createSignal<SS58String>()
export const selectedValidators$ = onChainSelectedValidators$.pipeState(
  map((v) => new Set(v)),
  switchMap((initialValidators) =>
    toggleValidator$.pipe(
      scan((acc, addr) => {
        const res = new Set(acc)
        if (res.has(addr)) {
          res.delete(addr)
        } else {
          res.add(addr)
        }
        return res
      }, initialValidators),
      startWith(initialValidators),
    ),
  ),
)

export const validatorsWithPreferences$ = state(
  combineLatest([aggregatedValidators$, validatorPrefs$]).pipe(
    map(
      ([validators, registerdValidators]) =>
        validators?.map((v) => {
          const prefs: {
            commission: number
            blocked: boolean
          } | null = registerdValidators[v.address] || null
          return {
            ...v,
            prefs,
          }
        }) ?? [],
    ),
  ),
)

const filteredValidators$ = validatorsWithPreferences$.pipe(
  // TODO include the ones currently selected (to be able to de-select them)
  map((v) => v.filter((v) => v && !v.blocked)),
)

export const [sortBy$, setSortBy] = createState<SortBy<HistoricValidator>>({
  prop: "nominatorApy",
  dir: "desc",
})
export const [search$, setSearch] = createState("")

export const sortedValidators$ = state(
  combineLatest([filteredValidators$, sortBy$]).pipe(
    map(([validators, sortBy]) =>
      sortBy === null ? validators : [...validators].sort(genericSort(sortBy)),
    ),
    withSearch(search$),
  ),
  [],
)
