import { SourceButton } from "@polkahub/ui-components";
import { ManageLedger, ManageReadOnly, ManageVault } from "polkahub";
import { type FC } from "react";

export const ConnectSource: FC = () => {
  return (
    <div>
      <h3>Manage Connections</h3>
      <div className="flex gap-2 flex-wrap items-center justify-center">
        <ManageReadOnly />
        <ManageLedger />
        <ManageVault />
        <SourceButton label="Wallet Connect" disabled>
          <img
            src={import.meta.env.BASE_URL + "walletConnect.svg"}
            alt="Vault"
            className="h-10 rounded"
          />
        </SourceButton>
      </div>
    </div>
  );
};
