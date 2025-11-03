import {
  ManageLedger,
  ManageReadOnly,
  ManageVault,
  WalletConnectButton,
} from "polkahub"
import { type FC } from "react"

export const ConnectSource: FC = () => (
  <div>
    <h3>Manage Connections</h3>
    <div className="flex gap-2 flex-wrap items-center justify-center">
      <ManageReadOnly />
      <ManageLedger />
      <ManageVault />
      <WalletConnectButton />
    </div>
  </div>
)
