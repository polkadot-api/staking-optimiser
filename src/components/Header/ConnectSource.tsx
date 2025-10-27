import { cn } from "@/lib/utils";
import { ManageLedger, ManageReadOnly, ManageVault } from "polkahub";
import { type FC, type MouseEvent, type PropsWithChildren } from "react";
import { Button } from "../ui/button";

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
