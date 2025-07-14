import {
  dot,
  dotAH,
  dotPpl,
  ksm,
  ksmAH,
  ksmPpl,
  pas,
  pasPpl,
  wnd,
  wndAH,
  wndPpl,
} from "@polkadot-api/descriptors";
import { type ChainDefinition, type TypedApi } from "polkadot-api";

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
      RockX: "wss://rockx-dot.w3node.com/polka-public-dot/ws",
      Stakeworld: "wss://dot-rpc.stakeworld.io",
    },
    people: {
      IBP1: "wss://sys.ibp.network/people-polkadot",
      IBP2: "wss://people-polkadot.dotters.network",
      LuckyFriday: "wss://rpc-people-polkadot.luckyfriday.io",
      Parity: "wss://polkadot-people-rpc.polkadot.io",
      RadiumBlock: "wss://people-polkadot.public.curie.radiumblock.co/ws",
    },
    assetHub: {
      Dwellir: "wss://asset-hub-polkadot-rpc.dwellir.com",
      "Dwellir Tunisia": "wss://statemint-rpc-tn.dwellir.com",
      IBP1: "wss://sys.ibp.network/asset-hub-polkadot",
      IBP2: "wss://asset-hub-polkadot.dotters.network",
      LuckyFriday: "wss://rpc-asset-hub-polkadot.luckyfriday.io",
      Parity: "wss://polkadot-asset-hub-rpc.polkadot.io",
      RadiumBlock: "wss://statemint.public.curie.radiumblock.co/ws",
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
      RockX: "wss://rockx-ksm.w3node.com/polka-public-ksm/ws",
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
      RadiumBlock: "wss://statemine.public.curie.radiumblock.co/ws",
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
      RadiumBlock: "wss://westend.public.curie.radiumblock.co/ws",
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

export type ClientType = "balances" | "staking";

export const clientTypesByChain: Record<
  KnownChains,
  Record<ClientType, ChainType>
> = {
  polkadot: {
    balances: "relay",
    staking: "relay",
  },
  kusama: {
    balances: "relay",
    staking: "relay",
  },
  westend: {
    balances: "relay",
    staking: "assetHub",
  },
  paseo: {
    balances: "relay",
    staking: "relay",
  },
};

export type BalancesTypedApi =
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
  | TypedApi<typeof ksm>
  | TypedApi<typeof wndAH>
  | TypedApi<typeof pas>;

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
    assetHub: pas,
  },
} satisfies Record<KnownChains, Record<ChainType, ChainDefinition>>;
