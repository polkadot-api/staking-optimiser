import { state } from "@react-rxjs/core"
import { type PolkadotSigner, type SS58String } from "polkadot-api"
import {
  createLedgerProvider,
  createMultisigProvider,
  createPjsWalletProvider,
  createPolkadotVaultProvider,
  createProxyProvider,
  createReadOnlyProvider,
  createSelectedAccountPlugin,
  multisigDirectSigner,
} from "polkahub"
import { combineLatest, firstValueFrom, map, switchMap } from "rxjs"
import { selectedChain$, stakingApi$, stakingSdk$ } from "./chain"
import {
  ss58FormatByChain,
  tokenDecimalsByChain,
  tokenSymbolByChain,
  USE_CHOPSTICKS,
} from "./chainConfig"
import { walletConnectProvider } from "@/lazy-polkahub"

const selectedAccountPlugin = createSelectedAccountPlugin()
const pjsWalletProvider = createPjsWalletProvider({
  accountFormat: "ss58",
})
const polkadotVaultProvider = createPolkadotVaultProvider()
const readOnlyProvider = createReadOnlyProvider({
  fakeSigner: USE_CHOPSTICKS,
})
const ledgerAccountProvider = createLedgerProvider(
  async () => {
    const module = await import("@ledgerhq/hw-transport-webusb")
    return module.default.create()
  },
  () =>
    firstValueFrom(
      selectedChain$.pipe(
        map((chain) => ({
          decimals: tokenDecimalsByChain[chain],
          tokenSymbol: tokenSymbolByChain[chain],
          ss58Format: ss58FormatByChain[chain],
        })),
      ),
    ),
)
const proxyProvider = createProxyProvider((address) =>
  firstValueFrom(
    stakingApi$.pipe(
      switchMap((api) => api.query.Proxy.Proxies.getValue(address)),
      map(([v]) => v),
    ),
  ),
)
const multisigProvider = createMultisigProvider(
  multisigDirectSigner(
    (multisig, callHash) =>
      firstValueFrom(
        stakingApi$.pipe(
          switchMap((api) =>
            api.query.Multisig.Multisigs.getValue(multisig, callHash),
          ),
        ),
      ),
    (uxt, len) =>
      firstValueFrom(
        stakingApi$.pipe(
          switchMap((api) =>
            api.apis.TransactionPaymentApi.query_info(uxt, len),
          ),
        ),
      ),
    {
      method: () => "as_multi",
    },
  ),
)

export const accountProviderPlugins = [
  selectedAccountPlugin,
  pjsWalletProvider,
  polkadotVaultProvider,
  readOnlyProvider,
  ledgerAccountProvider,
  walletConnectProvider,
  proxyProvider,
  multisigProvider,
]

export type SignerAccount = {
  address: SS58String
  polkadotSigner: PolkadotSigner
}
export const selectedSignerAccount$ =
  selectedAccountPlugin.selectedAccount$.pipeState(
    map((v): SignerAccount | null => {
      if (!v?.signer) return null

      return {
        address: v.address,
        polkadotSigner: v.signer,
      }
    }),
  )

export const selectedAccountAddr$ =
  selectedAccountPlugin.selectedAccount$.pipeState(
    map((v): SS58String | null => v?.address ?? null),
  )

export const accountStatus$ = state(
  combineLatest([stakingSdk$, selectedAccountPlugin.selectedAccount$]).pipe(
    switchMap(([sdk, account]) => {
      if (!account) return [null]

      return sdk.getAccountStatus$(account.address)
    }),
  ),
)
