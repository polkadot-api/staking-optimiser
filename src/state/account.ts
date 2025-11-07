import { state } from "@react-rxjs/core"
import { type PolkadotSigner, type SS58String } from "polkadot-api"
import {
  createLedgerProvider,
  createPjsWalletProvider,
  createPolkadotVaultProvider,
  createReadOnlyProvider,
  createSelectedAccountPlugin,
} from "polkahub"
import { combineLatest, firstValueFrom, map, switchMap } from "rxjs"
import { selectedChain$, stakingSdk$ } from "./chain"
import {
  ss58FormatByChain,
  tokenDecimalsByChain,
  tokenSymbolByChain,
  USE_CHOPSTICKS,
} from "./chainConfig"

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
const walletConnectProvider = import("polkahub").then(
  ({ createWalletConnectProvider, knownChains }) =>
    createWalletConnectProvider(import.meta.env.VITE_REOWN_PROJECT_ID, [
      knownChains.polkadot,
      knownChains.polkadotAh,
      knownChains.kusama,
      knownChains.kusamaAh,
      knownChains.paseo,
      knownChains.paseoAh,
    ]),
)

export const accountProviderPlugins = [
  selectedAccountPlugin,
  pjsWalletProvider,
  polkadotVaultProvider,
  readOnlyProvider,
  ledgerAccountProvider,
  walletConnectProvider,
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
