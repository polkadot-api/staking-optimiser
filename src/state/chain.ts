import { withChopsticksEnhancer } from "@/lib/chopsticksEnhancer";
import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
import { state, withDefault } from "@react-rxjs/core";
import { createClient, type PolkadotClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider, type JsonRpcProvider } from "polkadot-api/ws-provider";
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
  descriptorsByChain,
  rpcsByChain,
  stakingTypeByChain,
  tokenDecimalsByChain,
  tokenSymbolByChain,
  USE_CHOPSTICKS,
  type ChainType,
  type KnownChains,
  type PeopleTypedApi,
  type RelayTypedApi,
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

  const rpcs = rpcsByChain[chain];
  const stakingType = stakingTypeByChain[chain];
  const descriptors = descriptorsByChain[chain];

  const getRpcClient = (type: "relay" | "staking" | "people") => {
    const useChopsticks = USE_CHOPSTICKS && type === "staking";
    const chainType = type === "staking" ? stakingType : type;

    const url = useChopsticks
      ? ["ws://localhost:8132"]
      : shuffleArray(Object.values(rpcs[chainType]));

    let rpcProvider: JsonRpcProvider = getWsProvider(url);
    if (useChopsticks) {
      rpcProvider = withChopsticksEnhancer(rpcProvider);
    } else {
      rpcProvider = withPolkadotSdkCompat(rpcProvider);
    }

    return (clients[chainType] ??= createClient(
      withLogsRecorder((...v) => console.debug(chainType, ...v), rpcProvider)
    ));
  };

  const relayClient = getRpcClient("relay");
  const relayApi = relayClient.getTypedApi(
    descriptors["relay"]
  ) as RelayTypedApi;

  const stakingClient = getRpcClient("staking");
  const stakingApi = stakingClient.getTypedApi(
    descriptors[stakingType]
  ) as StakingTypedApi;

  const peopleClient = getRpcClient("people");
  const peopleApi = peopleClient.getTypedApi(
    descriptors["people"]
  ) as PeopleTypedApi;

  return [
    {
      relayClient,
      relayApi,
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

export const relayApi$ = clients$.pipeState(map((v) => v.relayApi));
export const stakingApi$ = clients$.pipeState(map((v) => v.stakingApi));
export const peopleApi$ = clients$.pipeState(map((v) => v.peopleApi));

export const stakingSdk$ = clients$.pipeState(
  map((client) => createStakingSdk(client.stakingClient))
);

export const identitySdk$ = peopleApi$.pipeState(
  map((peopleApi) => createIdentitySdk(peopleApi))
);

merge(stakingSdk$, identitySdk$).subscribe();
