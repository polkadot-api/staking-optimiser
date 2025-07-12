import { identity$ } from "@/state/identity";
import { getPublicKey, sliceMiddleAddr } from "@/util/ss58";
import { CopyText, PolkadotIdenticon } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import { CheckCircle } from "lucide-react";
import type { FC } from "react";

export const AddressIdentity: FC<{ addr: string }> = ({ addr }) => {
  let identity = useStateObservable(identity$(addr));

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
    <div className="flex items-center gap-2 overflow-hidden flex-1">
      <CopyText
        text={addr}
        copiedContent={<CheckCircle size={18} className="text-green-600 w-6" />}
      >
        <PolkadotIdenticon size={24} publicKey={getPublicKey(addr)} />
      </CopyText>
      {identity ? (
        identity.verified ? (
          <div className="flex items-center gap-2">
            <span>
              <span className="font-medium">{identity.value}</span>
              {subIdLabel}
            </span>
            <CheckCircle size={18} className="text-green-600" />
          </div>
        ) : (
          <div className="leading-tight">
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
