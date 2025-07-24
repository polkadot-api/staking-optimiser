import {
  DotWhitelistEntry,
  DotPplWhitelistEntry,
} from "@polkadot-api/descriptors";

export const whitelist: (DotWhitelistEntry | DotPplWhitelistEntry)[] = [
  "query.System.Account",
  "*.Staking",
  "*.VoterList",
  "*.NominationPools",
  "*.DelegatedStaking",
  "*.Identity",
  "const.Balances.ExistentialDeposit",
  "const.Babe.*",
  "const.System.SS58Prefix",
  "api.NominationPoolsApi.*",
];
