import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import { ModalContext } from "polkahub";
import {
  useContext,
  type FC,
  type MouseEvent,
  type PropsWithChildren,
} from "react";
import { LedgerAccounts } from "../LedgerAccounts";
import { Button } from "../ui/button";
import { VaultAccounts } from "../vault/VaultAccounts";
import { ManageAddresses } from "./ManageAddresses";

export const ConnectSource: FC = () => {
  const { setContent } = useContext(ModalContext)!;

  return (
    <div>
      <h3>Manage Connections</h3>
      <div className="flex gap-2 flex-wrap items-center justify-center">
        <SourceButton
          label="Address"
          onClick={() =>
            setContent(<ManageAddresses onClose={() => setContent(null)} />)
          }
        >
          <div>
            <Eye className="size-10" />
          </div>
        </SourceButton>
        <SourceButton
          label="Ledger"
          onClick={() => setContent(<LedgerAccounts setContent={setContent} />)}
        >
          <img
            src={import.meta.env.BASE_URL + "ledger.webp"}
            alt="Ledger"
            className="h-10 rounded"
          />
        </SourceButton>
        <SourceButton
          label="Vault"
          onClick={() => setContent(<VaultAccounts setContent={setContent} />)}
        >
          <img
            src={import.meta.env.BASE_URL + "vault.webp"}
            alt="Vault"
            className="h-10 rounded"
          />
        </SourceButton>
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

const SourceButton: FC<
  PropsWithChildren<{
    label: string;
    isSelected?: boolean;
    className?: string;
    onClick?: (evt: MouseEvent) => void;
    disabled?: boolean;
  }>
> = ({ label, isSelected, onClick, className, children, disabled }) => (
  <Button
    variant="outline"
    className={cn("h-auto min-w-40", isSelected ? "bg-accent" : "")}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
    <div className="text-left">
      <span className={cn("font-bold", className)}>{label}</span>
    </div>
  </Button>
);
