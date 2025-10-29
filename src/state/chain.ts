import { withChopsticksEnhancer } from "@/lib/chopsticksEnhancer";
import { location$ } from "@/router";
import { createLocalStorageState } from "@/util/rxjs";
import { createIdentitySdk } from "@polkadot-api/sdk-accounts";
import { createStakingSdk } from "@polkadot-api/sdk-staking";
import { state, withDefault } from "@react-rxjs/core";
import { createClient, type PolkadotClient } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getSmProvider } from "polkadot-api/sm-provider";
import type { Client as Smoldot } from "polkadot-api/smoldot";
import SmWorker from "polkadot-api/smoldot/worker?worker";
import { getWsProvider, type JsonRpcProvider } from "polkadot-api/ws-provider";
import { matchPath } from "react-router-dom";
import {
  combineLatest,
  concat,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  NEVER,
  switchMap,
} from "rxjs";
import {
  chainSpecsByChain,
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

let smoldot: Promise<Smoldot> | null = null;

export const [useSmoldot$, setUseSmoldot] = createLocalStorageState(
  "use-smoldot",
  false
);

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

const logsEnabled =
  import.meta.env.DEV || localStorage.getItem("rpc-logs") === "true";
const createClients = (chain: KnownChains, useSmoldoge: boolean) => {
  const clients: Partial<Record<ChainType, PolkadotClient>> = {};

  const rpcs = rpcsByChain[chain];
  const stakingType = stakingTypeByChain[chain];
  const descriptors = descriptorsByChain[chain];

  const getRpcClient = (type: "relay" | "staking" | "people") => {
    if (USE_CHOPSTICKS && type === "staking") {
      if (!clients.assetHub) {
        const rpcProvider = withChopsticksEnhancer(
          getWsProvider("ws://localhost:8132")
        );
        clients.assetHub = createClient(
          withLogsRecorder(
            (...v) => (logsEnabled ? console.debug(chainType, ...v) : null),
            rpcProvider
          )
        );
      }
      return clients.assetHub;
    }

    const chainType: ChainType = type === "staking" ? stakingType : type;
    if (clients[chainType]) return clients[chainType];

    let rpcProvider: JsonRpcProvider;
    if (useSmoldoge) {
      if (!smoldot) {
        smoldot = import("polkadot-api/smoldot/from-worker").then((module) =>
          module.startFromWorker(new SmWorker())
        );
      }

      const chainSpecs = [chainSpecsByChain[chain][chainType]()];
      if (chainType !== "relay") {
        chainSpecs.unshift(chainSpecsByChain[chain].relay());
      }
      rpcProvider = getSmProvider(
        Promise.all([smoldot, ...chainSpecs]).then(
          async ([smoldot, relaySpec, paraSpec]) => {
            const relayChain = await smoldot.addChain({ chainSpec: relaySpec });
            if (!paraSpec) return relayChain;
            return smoldot.addChain({
              chainSpec: paraSpec,
              potentialRelayChains: [relayChain],
            });
          }
        )
      );
    } else {
      const urls = shuffleArray(Object.values(rpcs[chainType]));
      rpcProvider = withPolkadotSdkCompat(getWsProvider(urls));
    }

    clients[chainType] = createClient(
      withLogsRecorder(
        (...v) => (logsEnabled ? console.debug(chainType, ...v) : null),
        rpcProvider
      )
    );
    return clients[chainType];
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
  combineLatest([selectedChain$, useSmoldot$]).pipe(
    switchMap(([chain, useSmoldot]) => {
      const [clients, teardown] = createClients(chain, useSmoldot);

      return concat([clients], NEVER).pipe(
        finalize(() => setTimeout(teardown, 100))
      );
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
