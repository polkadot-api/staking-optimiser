import {
  DotWhitelistEntry,
  DotPplWhitelistEntry,
} from "@polkadot-api/descriptors";

export const whitelist: (DotWhitelistEntry | DotPplWhitelistEntry)[] = [
  "query.System.Account",
  "*.Staking",
  "*.FastUnstake",
  "*.VoterList",
  "*.NominationPools",
  "*.DelegatedStaking",
  "*.Identity",
  "const.Balances.ExistentialDeposit",
  "const.Babe.*",
  "const.System.SS58Prefix",
  "api.NominationPoolsApi.*",
  "api.Inflation.experimental_inflation_prediction_info",
  "tx.Utility.batch_all",
  "query.Balances.TotalIssuance",
];
