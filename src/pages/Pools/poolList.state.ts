import { genericSort, type SortBy } from "@/components/SortBy";
import { stakingSdk$ } from "@/state/chain";
import { createState } from "@/util/rxjs";
import { type NominationPool as SdkNominationPool } from "@polkadot-api/sdk-staking";
import { state } from "@react-rxjs/core";
import { combineLatest, combineLatestWith, map, switchMap } from "rxjs";
import { aggregatedValidators$ } from "../Validators/validatorList.state";

const pools$ = state(
  stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPools()))
);

export interface NominationPool extends SdkNominationPool {
  minApy: number;
  maxApy: number;
  avgApy: number;
}

const poolNominations$ = state(
  combineLatest([
    pools$,
    aggregatedValidators$.pipe(
      map((validators) =>
        Object.fromEntries(validators?.map((v) => [v.address, v]) ?? [])
      )
    ),
  ]).pipe(
    map(([pools, validators]) =>
      pools.map((pool): NominationPool => {
        const nominations = pool.nominations
          .map((v) => validators[v])
          .filter((v) => v != null);
        const apys = nominations.map((v) => v.nominatorApy);
        const commissionMul = 1 - pool.commission.current;

        return {
          ...pool,
          minApy: apys.length
            ? apys.reduce((a, b) => Math.min(a, b)) * commissionMul
            : 0,
          maxApy: apys.reduce((a, b) => Math.max(a, b), 0) * commissionMul,
          avgApy: apys.length
            ? (apys.reduce((a, b) => a + b) / apys.length) * commissionMul
            : 0,
        };
      })
    )
  )
);

export const [sortBy$, setSortBy] = createState<SortBy<NominationPool>>({
  prop: "avgApy",
  dir: "desc",
});
export const [search$, setSearch] = createState("");

export const sortedPools$ = state(
  combineLatest([poolNominations$, sortBy$]).pipe(
    map(([pools, sortBy]) => {
      if (sortBy === null) return pools;
      if (sortBy.prop === "commission") {
        return [...pools].sort((a, b) => {
          const value = a.commission.current - b.commission.current;
          return sortBy.dir === "asc" ? value : -value;
        });
      }
      return [...pools].sort(genericSort(sortBy));
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
                  String(v.id).includes(search)
              )
          : sorted
    )
  )
);
