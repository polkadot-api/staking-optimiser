import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
import { state } from "@react-rxjs/core";
import { createClient, type PolkadotClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { matchPath } from "react-router-dom";
import {
  concat,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  NEVER,
  switchMap,
  tap,
} from "rxjs";
import {
  clientTypesByChain,
  descriptorsByChain,
  rpcsByChain,
  tokenDecimalsByChain,
  tokenSymbolByChain,
  type BalancesTypedApi,
  type ChainType,
  type KnownChains,
  type PeopleTypedApi,
  type StakingTypedApi,
} from "./chainConfig";
import { location$ } from "./location";

export const selectedChain$ = state(
  location$.pipe(
    map(
      (v) =>
        matchPath("/:chain/*", v.pathname)?.params.chain as
          | KnownChains
          | undefined
    ),
    filter((v) => v != null),
    distinctUntilChanged()
  )
);

export const tokenSymbol$ = selectedChain$.pipeState(
  map((chain) => tokenSymbolByChain[chain])
);
export const tokenDecimals$ = selectedChain$.pipeState(
  map((chain) => tokenDecimalsByChain[chain])
);

const shuffleArray = <T>(array: T[]): T[] =>
  array
    .map((v) => ({
      v,
      p: Math.random(),
    }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v);

const createClients = (chain: KnownChains) => {
  const clients: Partial<Record<ChainType, PolkadotClient>> = {};
  const getRpcClient = (chainType: ChainType) =>
    (clients[chainType] ??= createClient(
      withLogsRecorder(
        (...v) => console.debug(chainType, ...v),
        withPolkadotSdkCompat(
          getWsProvider(shuffleArray(Object.values(rpcs[chainType])))
        )
      )
    ));

  const rpcs = rpcsByChain[chain];
  const chainTypes = clientTypesByChain[chain];
  const descriptors = descriptorsByChain[chain];

  const balancesClient = getRpcClient(chainTypes["balances"]);
  const balancesApi = balancesClient.getTypedApi(
    descriptors[chainTypes["balances"]]
  ) as BalancesTypedApi;

  const stakingClient = getRpcClient(chainTypes["staking"]);
  const stakingApi = stakingClient.getTypedApi(
    descriptors[chainTypes["staking"]]
  ) as StakingTypedApi;

  const peopleClient = getRpcClient("people");
  const peopleApi = peopleClient.getTypedApi(
    descriptors["people"]
  ) as PeopleTypedApi;

  return [
    {
      balancesClient,
      balancesApi,
      stakingClient,
      stakingApi,
      peopleClient,
      peopleApi,
    },
    () => {
      Object.values(clients).forEach((client) => client.destroy());
    },
  ] as const;
};

export const clients$ = state(
  selectedChain$.pipe(
    tap((v) => {
      console.log("chain changed", v);
    }),
    switchMap((chain) => {
      const [clients, teardown] = createClients(chain);

      return concat([clients], NEVER).pipe(
        finalize(() => setTimeout(teardown, 100))
      );
    }),
    finalize(() => {
      console.log("finalize clients$");
    })
  )
);
clients$.subscribe();

export const balancesApi$ = clients$.pipe(map((v) => v.balancesApi));
export const stakingApi$ = clients$.pipe(map((v) => v.stakingApi));
export const peopleApi$ = clients$.pipe(map((v) => v.peopleApi));

export const stakingSdk$ = stakingApi$.pipe(
  map((stakingApi) =>
    createStakingSdk(stakingApi as any, {
      maxActiveNominators: 100,
    })
  )
);

export const identitySdk$ = peopleApi$.pipe(
  map((peopleApi) => createIdentitySdk(peopleApi as any))
);
