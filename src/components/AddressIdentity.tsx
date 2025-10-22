import { cn } from "@/lib/utils";
import { identity$ } from "@/state/identity";
import { getPublicKey, sliceMiddleAddr } from "@/util/ss58";
import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { CheckCircle } from "lucide-react";
import { useEffect, useRef, type FC, type PropsWithChildren } from "react";

export const AddressIdentity: FC<{
  addr: string;
  name?: string;
  copyable?: boolean;
  className?: string;
}> = ({ addr, name, className, copyable = true }) => {
  let identity = useStateObservable(identity$(addr));

  if (name && !identity) {
    identity = {
      value: name,
      verified: false,
    };
  }

  // Using the convention from subscan
  if (identity?.subId?.trim()) {
    identity = {
      ...identity,
      value: identity.value + "/",
    };
  }
  const subIdLabel = identity?.subId ? (
    <span className="text-muted-foreground text-sm">
      {identity.subId.trim()}
    </span>
  ) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-hidden flex-1",
        className
      )}
    >
      {copyable ? (
        <StopClickPropagation>
          <CopyText
            text={addr}
            copiedIndicator={
              <CheckCircle size={18} className="text-positive w-6" />
            }
          >
            <PolkadotIdenticon
              className="size-6"
              publicKey={getPublicKey(addr)}
            />
          </CopyText>
        </StopClickPropagation>
      ) : (
        <PolkadotIdenticon className="size-6" publicKey={getPublicKey(addr)} />
      )}
      {identity ? (
        identity.verified ? (
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="overflow-hidden text-ellipsis">
              <span className="font-medium">{identity.value}</span>
              {subIdLabel}
            </span>
            <CheckCircle size={18} className="text-positive shrink-0" />
          </div>
        ) : (
          <div className="leading-tight text-left">
            <div className="font-medium">
              {identity.value}
              {subIdLabel}
            </div>
            <div className="text-base">{sliceMiddleAddr(addr)}</div>
          </div>
        )
      ) : (
        <span className="text-base overflow-hidden text-ellipsis">
          {sliceMiddleAddr(addr)}
        </span>
      )}
    </div>
  );
};

const StopClickPropagation: FC<PropsWithChildren> = ({ children }) => {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const handleEvt = (evt: MouseEvent) => evt.preventDefault();
    element.addEventListener("click", handleEvt);
    return () => element.removeEventListener("click", handleEvt);
  }, []);

  return (
    <span className="inline-flex" ref={ref}>
      {children}
    </span>
  );
};
