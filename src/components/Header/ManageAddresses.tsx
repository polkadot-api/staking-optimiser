import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectedAccountPlugin } from "@/state/account";
import { state, useStateObservable } from "@react-rxjs/core";
import { Trash2 } from "lucide-react";
import { getSs58AddressInfo } from "polkadot-api";
import { createReadOnlyProvider } from "polkahub";
import { useState, type FC } from "react";
import { map } from "rxjs";
import { TotalBalance } from "../AccountBalance";

export const readOnlyProvider = createReadOnlyProvider();

const readOnlyAddresses$ = state(
  readOnlyProvider.accounts$.pipe(map((v) => v.map((v) => v.address))),
  []
);

export const ManageAddresses: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [addressInput, setAddressInput] = useState("");
  const readOnlyAddresses = useStateObservable(readOnlyAddresses$);

  const isAddrValid = (() => {
    try {
      return getSs58AddressInfo(addressInput).isValid;
    } catch {
      return false;
    }
  })();

  return (
    <div className="space-y-4">
      <form
        onSubmit={(evt) => {
          evt.preventDefault();
          if (!isAddrValid) return;
          const added = readOnlyProvider.addAccount(addressInput);

          selectedAccountPlugin.setAccount(added);
          setAddressInput("");
        }}
      >
        <h3 className="font-medium text-muted-foreground">
          Add read-only address
        </h3>
        <div className="flex gap-2 items-center">
          <Input
            name="address"
            value={addressInput}
            onChange={(evt) => setAddressInput(evt.target.value)}
          />
          <Button disabled={!isAddrValid}>Add</Button>
        </div>
      </form>
      {readOnlyAddresses.length ? (
        <div>
          <h3 className="font-medium text-muted-foreground">Added addresses</h3>
          <ul className="space-y-2">
            {readOnlyAddresses.map((addr) => (
              <li key={addr} className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  className="text-destructive"
                  type="button"
                  onClick={() => readOnlyProvider.removeAccount(addr)}
                >
                  <Trash2 />
                </Button>
                <AddressIdentity addr={addr} />
                <TotalBalance addr={addr} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    selectedAccountPlugin.setAccount(
                      readOnlyProvider.toAccount(addr)
                    );
                  }}
                >
                  Select
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button onClick={onClose} variant="secondary" type="button">
        Back
      </Button>
    </div>
  );
};
