import { withChopsticksEnhancer } from "@/lib/chopsticksEnhancer";
import { createState } from "@/util/rxjs";
import { createStakingSdk, type StakingSdk } from "@polkadot-api/sdk-staking";
import { state } from "@react-rxjs/core";
import { createClient, Enum, type SS58String } from "polkadot-api";
import { withLogsRecorder } from "polkadot-api/logs-provider";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";
import { getWsProvider, type JsonRpcProvider } from "polkadot-api/ws-provider";
import {
  concat,
  EMPTY,
  filter,
  finalize,
  fromEvent,
  map,
  mergeMap,
  NEVER,
  switchMap,
  withLatestFrom,
} from "rxjs";
import {
  rpcsByChain,
  stakingTypeByChain,
  USE_CHOPSTICKS,
  type ChainType,
  type KnownChains,
} from "./chainConfig";

export type Request = Enum<{
  setChain: KnownChains;
  getNominatorRewards: {
    id: number;
    address: SS58String;
    era: number;
  };
  getNominatorActiveValidators: {
    id: number;
    address: SS58String;
    era: number;
  };
}>;

export type NominatorRewardsResult = Awaited<
  ReturnType<StakingSdk["getNominatorRewards"]>
>;
export type NominatorValidatorsResult = Awaited<
  ReturnType<StakingSdk["getNominatorActiveValidators"]>
>;
export type Response = Enum<{
  result: {
    id: number;
    result: NominatorRewardsResult | NominatorValidatorsResult;
  };
  ready: undefined;
}>;

const shuffleArray = <T>(array: T[]): T[] =>
  array
    .map((v) => ({
      v,
      p: Math.random(),
    }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v);

const createSdk = (chain: KnownChains) => {
  const rpcs = rpcsByChain[chain];
  const stakingType = stakingTypeByChain[chain];

  const getRpcClient = () => {
    const chainType: ChainType = USE_CHOPSTICKS ? "assetHub" : stakingType;

    const url = USE_CHOPSTICKS
      ? ["ws://localhost:8132"]
      : shuffleArray(Object.values(rpcs[chainType]));

    let rpcProvider: JsonRpcProvider = getWsProvider(url);
    if (USE_CHOPSTICKS) {
      rpcProvider = withChopsticksEnhancer(rpcProvider);
    } else {
      rpcProvider = withPolkadotSdkCompat(rpcProvider);
    }

    return createClient(
      withLogsRecorder((...v) => console.debug(chainType, ...v), rpcProvider)
    );
  };

  const stakingClient = getRpcClient();
  const stakingSdk = createStakingSdk(stakingClient);

  return [
    stakingSdk,
    () => {
      stakingClient.destroy();
    },
  ] as const;
};

const [selectedChain$, setSelectedChain] = createState<KnownChains | null>(
  null
);

const stakingSdk$ = state(
  selectedChain$.pipe(
    switchMap((chain) => {
      if (!chain) return EMPTY;
      const [sdk, teardown] = createSdk(chain);

      return concat([sdk], NEVER).pipe(
        finalize(() => setTimeout(teardown, 100))
      );
    })
  )
);

const message$ = fromEvent<MessageEvent<Request>>(globalThis, "message").pipe(
  map((v) => v.data)
);

message$
  .pipe(filter((v) => v.type === "setChain"))
  .subscribe((v) => setSelectedChain(v.value));

message$
  .pipe(
    filter((v) => v.type === "getNominatorRewards"),
    withLatestFrom(stakingSdk$),
    mergeMap(
      async ([
        {
          value: { address, era, id },
        },
        sdk,
      ]) => {
        const result = await sdk.getNominatorRewards(address, era);
        return { type: "result", value: { id, result } } satisfies Response;
      }
    )
  )
  .subscribe((v) => globalThis.postMessage(v));

message$
  .pipe(
    filter((v) => v.type === "getNominatorActiveValidators"),
    withLatestFrom(stakingSdk$),
    mergeMap(
      async ([
        {
          value: { address, era, id },
        },
        sdk,
      ]) => {
        const result = await sdk.getNominatorActiveValidators(address, era);
        return { type: "result", value: { id, result } } satisfies Response;
      }
    )
  )
  .subscribe((v) => globalThis.postMessage(v));

globalThis.postMessage({
  type: "ready",
  value: undefined,
} satisfies Response);
