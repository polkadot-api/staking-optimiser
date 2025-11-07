import { getAddressTotalBalance } from "@/components/AccountBalance"
import { createPolkaHub } from "polkahub"
import { map } from "rxjs"
import { accountProviderPlugins } from "./account"
import { selectedChain$ } from "./chain"
import { ss58FormatByChain } from "./chainConfig"
import { getAddressIdentity } from "./identity"

export const polkaHub = createPolkaHub(accountProviderPlugins, {
  getIdentity: getAddressIdentity,
  getBalance: getAddressTotalBalance,
  ss58Format: selectedChain$.pipe(map((chain) => ss58FormatByChain[chain])),
})
