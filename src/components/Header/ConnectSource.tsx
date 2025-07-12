import { cn } from "@/lib/utils";
import { availableExtensions$ } from "@/state/account";
import { useStateObservable } from "@react-rxjs/core";
import { CircleQuestionMark, Eye } from "lucide-react";
import type { FC, MouseEvent, PropsWithChildren, ReactElement } from "react";
import { Button } from "../ui/button";

const knownExtensions: Record<string, { name: string; logo: string }> = {
  "polkadot-js": {
    name: "Polkadot JS",
    logo: import.meta.env.BASE_URL + "polkadotjs.webp",
  },
  "nova-wallet": {
    name: "Nova Wallet",
    logo: import.meta.env.BASE_URL + "novawallet.webp",
  },
  talisman: {
    name: "Talisman",
    logo: import.meta.env.BASE_URL + "talisman.webp",
  },
  "subwallet-js": {
    name: "Subwallet",
    logo: import.meta.env.BASE_URL + "subwallet.webp",
  },
};

export const ConnectSource: FC<{
  setContent: (element: ReactElement | null) => void;
}> = () => {
  const availableExtensions = useStateObservable(availableExtensions$).sort(
    (a, b) => (b in knownExtensions ? 1 : 0) - (a in knownExtensions ? 1 : 0)
  );

  return (
    <div className="space-y-4">
      {availableExtensions.length ? (
        <div>
          <h3>Manage Extensions</h3>
          <ul className="flex gap-2 flex-wrap items-center justify-center">
            {availableExtensions.map((id) => (
              <li key={id}>
                <ExtensionButton id={id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <h3>Manage Connections</h3>
        <div className="flex gap-2 flex-wrap items-center justify-center">
          <SourceButton label="Address">
            <div>
              <Eye className="size-10" />
            </div>
          </SourceButton>
          <SourceButton label="Ledger">
            <img
              src={import.meta.env.BASE_URL + "ledger.webp"}
              alt="Ledger"
              className="h-10 rounded"
            />
          </SourceButton>
          <SourceButton label="Vault">
            <img
              src={import.meta.env.BASE_URL + "vault.webp"}
              alt="Vault"
              className="h-10 rounded"
            />
          </SourceButton>
          <SourceButton label="Wallet Connect">
            <img
              src={import.meta.env.BASE_URL + "walletConnect.svg"}
              alt="Vault"
              className="h-10 rounded"
            />
          </SourceButton>
        </div>
      </div>
    </div>
  );
};

const ExtensionButton: FC<{
  id: string;
}> = ({ id }) => {
  const knownExtension = knownExtensions[id];

  // const selectedExtension = useStateObservable(selectedExtension$);
  const isSelected = false; // selectedExtension?.name === id;

  return (
    <SourceButton
      isSelected={isSelected}
      label={knownExtension?.name ?? id}
      // onClick={() => selectExtension(id)}
    >
      {knownExtension ? (
        <img
          src={knownExtension.logo}
          alt={knownExtension.name}
          className="h-10 rounded"
        />
      ) : (
        <div>
          <CircleQuestionMark
            className="size-10 text-muted-foreground"
            strokeWidth={1}
          />
        </div>
      )}
    </SourceButton>
  );
};

const SourceButton: FC<
  PropsWithChildren<{
    label: string;
    isSelected?: boolean;
    className?: string;
    onClick?: (evt: MouseEvent) => void;
  }>
> = ({ label, isSelected, onClick, className, children }) => (
  <Button
    variant="outline"
    className={cn("h-auto min-w-40", isSelected ? "bg-accent" : "")}
    onClick={onClick}
  >
    {children}
    <div className="text-left">
      <span className={cn("font-bold", className)}>{label}</span>
    </div>
  </Button>
);
