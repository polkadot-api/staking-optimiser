import { genericSort, type SortBy } from "@/components/SortBy";
import { PERBILL } from "@/constants";
import { stakingApi$ } from "@/state/chain";
import { createState } from "@/util/rxjs";
import type { NominationPoolsPoolState } from "@polkadot-api/descriptors";
import { u32 } from "@polkadot-api/substrate-bindings";
import { state } from "@react-rxjs/core";
import { AccountId, Binary, type SS58String } from "polkadot-api";
import { mergeUint8 } from "polkadot-api/utils";
import {
  combineLatest,
  combineLatestWith,
  from,
  map,
  startWith,
  switchMap,
  withLatestFrom,
} from "rxjs";
import {
  aggregatedValidators$,
  type HistoricValidator,
} from "../Validators/validatorList.state";

const pools$ = state(
  stakingApi$.pipe(
    switchMap((stakingApi) => {
      const pools$ = from(
        stakingApi.query.NominationPools.BondedPools.getEntries()
      ).pipe(
        withLatestFrom(stakingApi.constants.System.SS58Prefix()),
        switchMap(async ([pools, ss58Format]) => {
          const activePools = pools
            .filter(
              (p) =>
                p.value.roles.nominator != null && p.value.roles.root != null
            )
            .map((pool) => ({
              ...pool,
              address: AccountId(ss58Format).dec(
                mergeUint8([
                  Binary.fromText("modlpy/nopls").asBytes(),
                  new Uint8Array([0]),
                  u32.enc(pool.keyArgs[0]),
                  new Uint8Array(new Array(32).fill(0)),
                ])
              ),
            }));
          const nominations =
            await stakingApi.query.Staking.Nominators.getValues(
              activePools.map((p) => [p.address])
            );

          return activePools.map((pool, i) => ({
            id: pool.keyArgs[0],
            address: pool.address,
            commission: (pool.value.commission.current?.[0] ?? 0) / PERBILL,
            members: pool.value.member_counter,
            state: pool.value.state,
            nominations: nominations[i]?.targets ?? [],
          }));
        })
      );

      const names$ = from(
        stakingApi.query.NominationPools.Metadata.getEntries()
      ).pipe(
        map(
          (entries) =>
            Object.fromEntries(
              entries.map(({ keyArgs: [key], value }) => [key, value.asText()])
            ) as Record<number, string>
        ),
        startWith({} as Record<number, string>)
      );

      return combineLatest([pools$, names$]).pipe(
        map(([pools, names]) =>
          pools.map((pool) => ({
            ...pool,
            name: names[pool.id] as string | undefined,
          }))
        )
      );
    })
  )
);

export interface NominationPool {
  name: string | undefined;
  id: number;
  address: SS58String;
  commission: number;
  members: number;
  state: NominationPoolsPoolState;
  nominations: HistoricValidator[];
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
        const commissionMul = 1 - pool.commission;

        return {
          ...pool,
          nominations,
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
    map(([pools, sortBy]) =>
      sortBy === null ? pools : [...pools].sort(genericSort(sortBy))
    ),
    combineLatestWith(search$),
    map(
      ([sorted, search]): Array<NominationPool & { position?: number }> =>
        search
          ? sorted
              .map((v, i) => ({ ...v, position: i }))
              .filter(
                (v) =>
                  v.address
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
