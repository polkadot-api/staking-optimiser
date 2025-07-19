import { AddressIdentity } from "@/components/AddressIdentity";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { stakingApi$ } from "@/state/chain";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { combineLatest, from, map, switchMap, withLatestFrom } from "rxjs";
import { aggregatedValidators$ } from "./Validators/validatorList.state";
import { AccountId, Binary } from "polkadot-api";
import { mergeUint8 } from "polkadot-api/utils";
import { u32 } from "@polkadot-api/substrate-bindings";

const pools$ = state(
  stakingApi$.pipe(
    switchMap((stakingApi) => {
      return from(
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
            commission: pool.value.commission.current?.[0] ?? 0,
            members: pool.value.member_counter,
            state: pool.value.state,
            nominations: nominations[i]?.targets ?? [],
          }));
        })
      );
    })
  )
);

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
      pools
        .map((pool) => {
          const nominations = pool.nominations
            .map((v) => validators[v])
            .filter((v) => v != null);
          const apys = nominations.map((v) => v.nominatorApy);
          const commissionMul = 1 - pool.commission / 1_000_000_000;

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
        .sort((a, b) => b.avgApy - a.avgApy)
    )
  )
);

export const Pools = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <PoolList />
      </Subscribe>
    </div>
  );
};

const PoolList = () => {
  const pools = useStateObservable(poolNominations$);

  return (
    <div>
      {pools.map((p) => (
        <div key={p.id}>
          <div>#{p.id}</div>
          <AddressIdentity addr={p.address} />
          <div>Min APY: {p.minApy * 100}</div>
          <div>Max APY: {p.maxApy * 100}</div>
          <div>Avg APY: {p.avgApy * 100}</div>
        </div>
      ))}
    </div>
  );
};
