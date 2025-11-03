import { shareLatest, state } from "@react-rxjs/core"
import { AccountId, type PolkadotSigner, type SS58String } from "polkadot-api"
import {
  createLedgerProvider,
  createPjsWalletProvider,
  createPolkadotVaultProvider,
  createReadOnlyProvider,
  createSelectedAccountPlugin,
} from "polkahub"
import { combineLatest, firstValueFrom, map, switchMap } from "rxjs"
import { selectedChain$, stakingApi$, stakingSdk$ } from "./chain"
import {
  tokenDecimalsByChain,
  tokenSymbolByChain,
  USE_CHOPSTICKS,
} from "./chainConfig"

const ss58Format$ = stakingApi$.pipe(
  switchMap((v) => v.constants.System.SS58Prefix()),
  shareLatest(),
)

const selectedAccountPlugin = createSelectedAccountPlugin()
const pjsWalletProvider = createPjsWalletProvider()
const polkadotVaultProvider = createPolkadotVaultProvider()
const readOnlyProvider = createReadOnlyProvider({
  fakeSigner: USE_CHOPSTICKS,
})
const ledgerAccountProvider = createLedgerProvider(
  async () => {
    const module = await import("@ledgerhq/hw-transport-webhid")
    return module.default.create()
  },
  () =>
    firstValueFrom(
      combineLatest({
        chain: selectedChain$,
        ss58Format: ss58Format$,
      }).pipe(
        map(({ chain, ss58Format }) => ({
          decimals: tokenDecimalsByChain[chain],
          tokenSymbol: tokenSymbolByChain[chain],
          ss58Format,
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

const formattedAccount$ = state(
  combineLatest([
    selectedAccountPlugin.selectedAccount$,
    ss58Format$.pipe(map((format) => AccountId(format))),
  ]).pipe(
    map(([selectedAccount, codec]) =>
      selectedAccount
        ? {
            ...selectedAccount,
            address: codec.dec(codec.enc(selectedAccount.address)),
          }
        : null,
    ),
  ),
)

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

export const selectedAccountAddr$ = formattedAccount$.pipeState(
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
