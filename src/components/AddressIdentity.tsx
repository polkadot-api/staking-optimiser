import { identity$ } from "@/state/identity";
import { AccountDisplay } from "@polkadot-api/react-components";
import { useStateObservable } from "@react-rxjs/core";
import type { FC } from "react";

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

  return (
    <AccountDisplay
      account={{
        address: addr,
        name: identity?.value ?? name,
        subId: identity?.subId,
        verified: identity?.verified,
      }}
      className={className}
      copyable={copyable}
      maxAddrLength={12}
    />
  );
};
