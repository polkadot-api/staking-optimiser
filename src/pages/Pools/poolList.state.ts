import { genericSort, type SortBy } from "@/components/SortBy"
import { PERBILL } from "@/constants"
import { stakingSdk$ } from "@/state/chain"
import { activeEraNumber$, eraDurationInMs$, getEraApy } from "@/state/era"
import { getNominatorRewards } from "@/state/nominatorInfo"
import { createState } from "@/util/rxjs"
import { type NominationPool as SdkNominationPool } from "@polkadot-api/sdk-staking"
import { state } from "@react-rxjs/core"
import { combineLatest, combineLatestWith, map, switchMap } from "rxjs"
import {
  aggregatedValidators$,
  type HistoricValidator,
} from "../Validators/validatorList.state"

export const pools$ = state(
  stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPools())),
)

export interface NominationPool extends SdkNominationPool {
  minApy: number
  maxApy: number
  avgApy: number
}

export function calculatePoolApy(
  pool: SdkNominationPool,
  validators: Record<string, HistoricValidator>,
): NominationPool {
  const nominations = pool.nominations
    .map((v) => validators[v])
    .filter((v) => v != null)
  const apys = nominations.map((v) => v.nominatorApy)
  const commissionMul = 1 - pool.commission.current

  return {
    ...pool,
    minApy: apys.length
      ? apys.reduce((a, b) => Math.min(a, b)) * commissionMul
      : 0,
    maxApy: apys.reduce((a, b) => Math.max(a, b), 0) * commissionMul,
    avgApy: apys.length
      ? (apys.reduce((a, b) => a + b) / apys.length) * commissionMul
      : 0,
  }
}

const poolNominations$ = state(
  combineLatest([
    pools$,
    aggregatedValidators$.pipe(
      map((validators) =>
        Object.fromEntries(validators?.map((v) => [v.address, v]) ?? []),
      ),
    ),
  ]).pipe(
    map(([pools, validators]) =>
      pools.map((pool): NominationPool => calculatePoolApy(pool, validators)),
    ),
  ),
)

export const [sortBy$, setSortBy] = createState<SortBy<NominationPool>>({
  prop: "avgApy",
  dir: "desc",
})
export const [search$, setSearch] = createState("")

export const sortedPools$ = state(
  combineLatest([poolNominations$, sortBy$]).pipe(
    map(([pools, sortBy]) => {
      if (sortBy === null) return pools
      if (sortBy.prop === "commission") {
        return [...pools].sort((a, b) => {
          const value = a.commission.current - b.commission.current
          return sortBy.dir === "asc" ? value : -value
        })
      }
      return [...pools].sort(genericSort(sortBy))
    }),
    combineLatestWith(search$),
    map(
      ([sorted, search]): Array<NominationPool & { position?: number }> =>
        search
          ? sorted
              .map((v, i) => ({ ...v, position: i }))
              .filter(
                (v) =>
                  v.addresses.pool
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()) ||
                  v.name
                    ?.toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()) ||
                  String(v.id).includes(search),
              )
          : sorted,
    ),
  ),
)

export const lastEraRewards$ = state(
  (id: number) =>
    combineLatest([
      stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id))),
      activeEraNumber$,
      eraDurationInMs$,
    ]).pipe(
      switchMap(([pool, era, eraDurationInMs]) => {
        if (!pool) return [null]

        return getNominatorRewards(pool.addresses.pool, [era - 1]).pipe(
          map(({ result }) => {
            if (!result) return null
            const poolMembers =
              (result.total *
                BigInt(Math.round((1 - pool.commission.current) * PERBILL))) /
              BigInt(PERBILL)
            return {
              poolNominator: result.total,
              validator: result.totalCommission,
              poolMembers,
              activeBond: result.activeBond,
              apy: getEraApy(poolMembers, result.activeBond, eraDurationInMs),
            }
          }),
        )
      }),
    ),
  null,
)
