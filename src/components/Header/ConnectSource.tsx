import { selectedChain$ } from "@/state/chain"
import {
  fallbackMultisigProviders,
  novasamaProvider,
  subscanProvider,
  throttleMultisigProvider,
} from "@polkadot-api/sdk-accounts"
import {
  ManageLedger,
  ManageMultisig,
  ManageProxy,
  ManageReadOnly,
  ManageVault,
  WalletConnectButton,
} from "polkahub"
import { type FC } from "react"
import { firstValueFrom } from "rxjs"

const multisigProvider = firstValueFrom(selectedChain$).then((chain) =>
  fallbackMultisigProviders(
    novasamaProvider(chain === "kusama" ? "kusama" : "polkadot"),
    throttleMultisigProvider(
      subscanProvider(chain, import.meta.env.VITE_SUBSCAN_API_KEY),
      2,
    ),
  ),
)

export const ConnectSource: FC = () => (
  <div>
    <h3>Manage Connections</h3>
    <div className="flex gap-2 flex-wrap items-center justify-center">
      <ManageLedger />
      <ManageVault />
      <WalletConnectButton />
      <ManageReadOnly />
      <ManageProxy />
      <ManageMultisig
        getMultisigDetails={async (addr) => {
          const provider = await multisigProvider
          return provider(addr)
        }}
      />
    </div>
  </div>
)

// 13dXmfrN4Prb3FmdxKDNRyUeNDuNwUTZibYAMFNKmZJut2Lq
