import { X, Plus, CheckCircle2, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { getPublicKey } from "@/util/ss58";
import { useStateObservable } from "@react-rxjs/core";
import { identity$ } from "@/state/identity";

interface ValidatorCardProps {
  address: string;
  apy: number;
  onRemove: (address: string) => void;
}

export function ValidatorCard({ address, apy, onRemove }: ValidatorCardProps) {
  let identity = useStateObservable(identity$(address));
  const name =
    identity && identity.value + (identity.subId ? `/${identity.subId}` : "");
  const displayName = name || address;
  return (
    <Card className="group relative transition-all hover:shadow-md p-2 border-0 shadow-sm ring-2 ring-primary/50 bg-primary/5 shadow-md">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(address);
        }}
        className="absolute -top-1.5 -right-1.5 z-10 bg-background border border-border shadow-sm text-muted-foreground rounded-full p-0.5 hover:bg-muted hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
        aria-label="Remove validator"
      >
        <X className="size-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full shrink-0 AccountDisplay">
          <CopyText
            text={address}
            copiedIndicator={
              <div className="AccountDisplay_copied">
                <CheckCircle size={18} className="text-positive shrink-0" />
              </div>
            }
          >
            <PolkadotIdenticon
              className="Identicon"
              publicKey={getPublicKey(address)}
            />
          </CopyText>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium truncate" title={displayName}>
              {displayName}
            </p>
            {identity?.verified && (
              <CheckCircle2 className="size-3 text-green-500 shrink-0" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[9px] text-muted-foreground leading-none">
            APY
          </span>
          <span className="text-xs font-semibold text-primary leading-none mt-0.5">
            {apy.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  );
}

export function EmptyValidatorSlot() {
  return (
    <Card className="p-2 border-dashed border-2 border-border/30 bg-muted/10 flex items-center justify-center min-h-[52px]">
      <Plus className="size-4 text-muted-foreground/30" />
    </Card>
  );
}
