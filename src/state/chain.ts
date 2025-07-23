import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
import { state, withDefault } from "@react-rxjs/core";
import { createClient, type PolkadotClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import {
  getWsProvider,
  type JsonRpcProvider,
} from "polkadot-api/ws-provider/web";
import { matchPath } from "react-router-dom";
import {
  concat,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
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
  USE_CHOPSTICKS,
  type BalancesTypedApi,
  type ChainType,
  type KnownChains,
  type PeopleTypedApi,
  type StakingTypedApi,
} from "./chainConfig";
import { location$ } from "./location";
import { withChopsticksEnhancer } from "@/lib/chopsticksEnhancer";

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

export const tokenProps$ = selectedChain$.pipeState(
  map((chain) => ({
    decimals: tokenDecimalsByChain[chain],
    symbol: tokenSymbolByChain[chain],
  })),
  withDefault(null)
);

export const tokenDecimals$ = tokenProps$.pipeState(
  filter((v) => v != null),
  map((props) => props.decimals)
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
  const getRpcClient = (chainType: ChainType) => {
    let rpcProvider: JsonRpcProvider = getWsProvider(
      shuffleArray(Object.values(rpcs[chainType]))
    );
    if (USE_CHOPSTICKS && chainType === "relay") {
      rpcProvider = withChopsticksEnhancer(rpcProvider);
    } else {
      rpcProvider = withPolkadotSdkCompat(rpcProvider);
    }

    return (clients[chainType] ??= createClient(
      withLogsRecorder((...v) => console.debug(chainType, ...v), rpcProvider)
    ));
  };

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

merge(stakingSdk$, identitySdk$).subscribe();
