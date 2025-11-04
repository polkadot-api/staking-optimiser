import { getAddressTotalBalance } from "@/components/AccountBalance"
import { createPolkaHub } from "polkahub"
import { accountProviderPlugins } from "./account"
import { getAddressIdentity } from "./identity"

export const polkaHub = createPolkaHub(accountProviderPlugins, {
  getIdentity: getAddressIdentity,
  getBalance: getAddressTotalBalance,
})
