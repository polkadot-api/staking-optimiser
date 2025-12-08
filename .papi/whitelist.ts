import type {
  WhitelistEntriesByChain,
  DotPplWhitelistEntry,
  DotWhitelistEntry,
  DotAHWhitelistEntry,
  WndAHWhitelistEntry,
} from "@polkadot-api/descriptors"

const relayWhitelist: DotWhitelistEntry[] = [
  "query.Staking.SlashingSpans",
  "const.Babe.EpochDuration",
  "const.Babe.ExpectedBlockTime",
  "api.Inflation.experimental_inflation_prediction_info",
]
const assetHubWhitelist: (DotAHWhitelistEntry | WndAHWhitelistEntry)[] = [
  "const.Staking.BondingDuration",
  "const.Staking.HistoryDepth",
  "const.Staking.SessionsPerEra",
  "query.Staking.ActiveEra",
  "query.Staking.Bonded",
  "query.Staking.CounterForNominators",
  "query.Staking.CounterForValidators",
  "query.Staking.CurrentEra",
  "query.Staking.ErasStakersOverview", // TODO
  "query.Staking.ErasTotalStake",
  "query.Staking.ErasValidatorPrefs", // TODO
  "query.Staking.Ledger",
  "query.Staking.MaxNominatorsCount",
  "query.Staking.MaxValidatorsCount",
  "query.Staking.MinimumActiveStake",
  "query.Staking.MinNominatorBond",
  "query.Staking.Nominators",
  "query.Staking.ValidatorCount",
  "query.Staking.Validators",
  "query.Staking.Validators", // TODO
  "query.System.Account",
  "tx.Staking.withdraw_unbonded",
  "const.FastUnstake.Deposit",
  "const.FastUnstake.Deposit",
  "query.FastUnstake.CounterForQueue",
  "query.FastUnstake.ErasToCheckPerBlock",
  "query.FastUnstake.Head",
  "tx.FastUnstake.register_fast_unstake", // TODO
  "query.VoterList.ListBags",
  "query.VoterList.ListNodes",
  "query.NominationPools.BondedPools",
  "query.NominationPools.Metadata",
  "query.NominationPools.MinJoinBond",
  "tx.NominationPools.bond_extra",
  "tx.NominationPools.claim_payout",
  "tx.NominationPools.join",
  "tx.NominationPools.unbond",
  "tx.NominationPools.withdraw_unbonded",
  "query.Balances.TotalIssuance",
  "query.Timestamp.Now",
  "const.System.SS58Prefix",
]
const pplWhitelist: DotPplWhitelistEntry[] = [
  "query.Identity.IdentityOf",
  "query.Identity.SuperOf",
]

export const whitelist: WhitelistEntriesByChain = {
  dot: relayWhitelist,
  dotAH: assetHubWhitelist,
  dotPpl: pplWhitelist,
  ksm: relayWhitelist,
  ksmAH: assetHubWhitelist,
  ksmPpl: pplWhitelist,
  wnd: relayWhitelist,
  wndAH: assetHubWhitelist,
  wndPpl: pplWhitelist,
  pas: relayWhitelist,
  pasAH: assetHubWhitelist,
  pasPpl: pplWhitelist,
}
