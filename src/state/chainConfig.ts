import {
  dot,
  dotAH,
  dotPpl,
  ksm,
  ksmAH,
  ksmPpl,
  pas,
  pasAH,
  pasPpl,
  wnd,
  wndAH,
  wndPpl,
} from "@polkadot-api/descriptors";
import { type ChainDefinition, type TypedApi } from "polkadot-api";

export const USE_CHOPSTICKS = import.meta.env.VITE_WITH_CHOPSTICKS;

export type KnownChains = "polkadot" | "kusama" | "westend" | "paseo";
export const knownChains: Array<KnownChains> = [
  "polkadot",
  "kusama",
  "paseo",
  "westend",
];

export const tokenSymbolByChain: Record<KnownChains, string> = {
  polkadot: "DOT",
  kusama: "KSM",
  westend: "WND",
  paseo: "PAS",
};

export const tokenDecimalsByChain: Record<KnownChains, number> = {
  polkadot: 10,
  kusama: 12,
  westend: 12,
  paseo: 12,
};

const INDEXER_URI = "https://staking-eras.usepapi.app/";
export const indexerUrl: Record<KnownChains, string> = {
  polkadot: `${INDEXER_URI}dot`,
  kusama: `${INDEXER_URI}ksm`,
  westend: `${INDEXER_URI}wnd`,
  paseo: `${INDEXER_URI}pas`,
};

export type ChainType = "relay" | "people" | "assetHub";

export const rpcsByChain: Record<
  KnownChains,
  Record<ChainType, Record<string, string>>
> = {
  polkadot: {
    relay: {
      Allnodes: "wss://polkadot-rpc.publicnode.com",
      Blockops: "wss://polkadot-public-rpc.blockops.network/ws",
      Dwellir: "wss://polkadot-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://polkadot-rpc-tn.dwellir.com",
      IBP1: "wss://rpc.ibp.network/polkadot",
      IBP2: "wss://polkadot.dotters.network",
      LuckyFriday: "wss://rpc-polkadot.luckyfriday.io",
      Stakeworld: "wss://dot-rpc.stakeworld.io",
    },
    people: {
      IBP1: "wss://sys.ibp.network/people-polkadot",
      IBP2: "wss://people-polkadot.dotters.network",
      LuckyFriday: "wss://rpc-people-polkadot.luckyfriday.io",
      Parity: "wss://polkadot-people-rpc.polkadot.io",
    },
    assetHub: {
      Dwellir: "wss://asset-hub-polkadot-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://statemint-rpc-tn.dwellir.com",
      IBP1: "wss://sys.ibp.network/asset-hub-polkadot",
      IBP2: "wss://asset-hub-polkadot.dotters.network",
      LuckyFriday: "wss://rpc-asset-hub-polkadot.luckyfriday.io",
      Parity: "wss://polkadot-asset-hub-rpc.polkadot.io",
      Stakeworld: "wss://dot-rpc.stakeworld.io/assethub",
    },
  },
  kusama: {
    relay: {
      Allnodes: "wss://kusama-rpc.publicnode.com",
      Dwellir: "wss://kusama-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://kusama-rpc-tn.dwellir.com",
      IBP1: "wss://rpc.ibp.network/kusama",
      IBP2: "wss://kusama.dotters.network",
      LuckyFriday: "wss://rpc-kusama.luckyfriday.io",
      Stakeworld: "wss://ksm-rpc.stakeworld.io",
    },
    people: {
      Dwellir: "wss://people-kusama-rpc.dwellir.com",
      IBP1: "wss://sys.ibp.network/people-kusama",
      IBP2: "wss://people-kusama.dotters.network",
      LuckyFriday: "wss://rpc-people-kusama.luckyfriday.io",
      Parity: "wss://kusama-people-rpc.polkadot.io",
      Stakeworld: "wss://ksm-rpc.stakeworld.io/people",
    },
    assetHub: {
      Dwellir: "wss://asset-hub-kusama-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://statemine-rpc-tn.dwellir.com",
      IBP1: "wss://sys.ibp.network/statemine",
      IBP2: "wss://asset-hub-kusama.dotters.network",
      LuckyFriday: "wss://rpc-asset-hub-kusama.luckyfriday.io",
      Parity: "wss://kusama-asset-hub-rpc.polkadot.io",
      Stakeworld: "wss://ksm-rpc.stakeworld.io/assethub",
    },
  },
  westend: {
    relay: {
      Dwellir: "wss://westend-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://westend-rpc-tn.dwellir.com",
      IBP1: "wss://rpc.ibp.network/westend",
      IBP2: "wss://westend.dotters.network",
      Parity: "wss://westend-rpc.polkadot.io",
    },
    people: {
      Dwellir: "wss://people-westend-rpc.dwellir.com",
      IBP1: "wss://sys.ibp.network/people-westend",
      IBP2: "wss://people-westend.dotters.network",
      Parity: "wss://westend-people-rpc.polkadot.io",
    },
    assetHub: {
      Dwellir: "wss://asset-hub-westend-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://westmint-rpc-tn.dwellir.com",
      IBP1: "wss://sys.ibp.network/westmint",
      IBP2: "wss://asset-hub-westend.dotters.network",
      Parity: "wss://westend-asset-hub-rpc.polkadot.io",
    },
  },
  paseo: {
    relay: {
      Amforc: "wss://paseo.rpc.amforc.com",
      Dwellir: "wss://paseo-rpc.dwellir.com",
      IBP1: "wss://rpc.ibp.network/paseo",
      IBP2: "wss://paseo.dotters.network",
      StakeWorld: "wss://pas-rpc.stakeworld.io",
    },
    people: {
      Amforc: "wss://people-paseo.rpc.amforc.com",
      IBP2: "wss://people-paseo.dotters.network",
    },
    assetHub: {
      Dwellir: "wss://asset-hub-paseo-rpc.dwellir.com",
      IBP1: "wss://sys.ibp.network/asset-hub-paseo",
      IBP2: "wss://asset-hub-paseo.dotters.network",
      StakeWorld: "wss://pas-rpc.stakeworld.io/assethub",
      TurboFlakes: "wss://sys.turboflakes.io/asset-hub-paseo",
    },
  },
};

const grabChainSpec = (module: Promise<{ chainSpec: string }>) =>
  module.then((m) => m.chainSpec);
export const chainSpecsByChain: Record<
  KnownChains,
  Record<ChainType, () => Promise<string>>
> = {
  polkadot: {
    relay: () => grabChainSpec(import("polkadot-api/chains/polkadot")),
    people: () => grabChainSpec(import("polkadot-api/chains/polkadot_people")),
    assetHub: () =>
      grabChainSpec(import("polkadot-api/chains/polkadot_asset_hub")),
  },
  kusama: {
    relay: () => grabChainSpec(import("polkadot-api/chains/ksmcc3")),
    people: () => grabChainSpec(import("polkadot-api/chains/ksmcc3_people")),
    assetHub: () =>
      grabChainSpec(import("polkadot-api/chains/ksmcc3_asset_hub")),
  },
  westend: {
    relay: () => grabChainSpec(import("polkadot-api/chains/westend2")),
    people: () => grabChainSpec(import("polkadot-api/chains/westend2_people")),
    assetHub: () =>
      grabChainSpec(import("polkadot-api/chains/westend2_asset_hub")),
  },
  paseo: {
    relay: () => grabChainSpec(import("polkadot-api/chains/paseo")),
    people: () => grabChainSpec(import("polkadot-api/chains/paseo_people")),
    assetHub: () =>
      grabChainSpec(import("polkadot-api/chains/paseo_asset_hub")),
  },
};

export const stakingTypeByChain: Record<KnownChains, ChainType> = {
  polkadot: "relay",
  kusama: "assetHub",
  westend: "assetHub",
  paseo: "assetHub",
};

export type RelayTypedApi =
  | TypedApi<typeof dot>
  | TypedApi<typeof ksm>
  | TypedApi<typeof wnd>
  | TypedApi<typeof pas>;

export type PeopleTypedApi =
  | TypedApi<typeof dotPpl>
  | TypedApi<typeof ksmPpl>
  | TypedApi<typeof wndPpl>
  | TypedApi<typeof pasPpl>;

export type StakingTypedApi =
  | TypedApi<typeof dot>
  | TypedApi<typeof ksmAH>
  | TypedApi<typeof wndAH>
  | TypedApi<typeof pasAH>;

export const descriptorsByChain = {
  polkadot: {
    relay: dot,
    people: dotPpl,
    assetHub: dotAH,
  },
  kusama: {
    relay: ksm,
    people: ksmPpl,
    assetHub: ksmAH,
  },
  westend: {
    relay: wnd,
    people: wndPpl,
    assetHub: wndAH,
  },
  paseo: {
    relay: pas,
    people: pasPpl,
    assetHub: pasAH,
  },
} satisfies Record<KnownChains, Record<ChainType, ChainDefinition>>;
