import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { setAccountSource } from "@/state/account";
import {
  setVaultAccounts,
  vaultAccounts$,
  type VaultAccount,
} from "@/state/vault";
import { useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { Trash2 } from "lucide-react";
import { getSs58AddressInfo } from "polkadot-api";
import { useCallback, type FC, type ReactElement } from "react";
import { withLatestFrom } from "rxjs";
import { QrCamera } from "./QrCamera";

export const VaultAccounts: FC<{
  setContent: (element: ReactElement | null) => void;
}> = ({ setContent }) => {
  const vaultAccounts = useStateObservable(vaultAccounts$);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={() =>
          setContent(
            <ScanAccount
              onClose={() =>
                setContent(<VaultAccounts setContent={setContent} />)
              }
            />
          )
        }
      >
        Scan new account
      </Button>
      {vaultAccounts.length ? (
        <div>
          <h3 className="font-medium text-muted-foreground">Added addresses</h3>
          <ul className="space-y-2">
            {vaultAccounts.map((acc) => (
              <li
                key={`${acc.address}-${acc.genesis}`}
                className="flex gap-2 items-center"
              >
                <Button
                  variant="outline"
                  className="text-destructive"
                  type="button"
                  onClick={() =>
                    setVaultAccounts(vaultAccounts.filter((v) => acc !== v))
                  }
                >
                  <Trash2 />
                </Button>
                <AddressIdentity addr={acc.address} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAccountSource({
                      type: "vault",
                      value: acc,
                    });
                  }}
                >
                  Select
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Button
        onClick={() => setContent(null)}
        variant="secondary"
        type="button"
      >
        Back
      </Button>
    </div>
  );
};

const [scannedAccount$, scannedAccount] = createSignal<VaultAccount>();
scannedAccount$
  .pipe(withLatestFrom(vaultAccounts$))
  .subscribe(([account, oldAccounts]) => {
    const accountKey = `${account.address}:${account.genesis}`;
    if (
      oldAccounts.some((acc) => `${acc.address}:${acc.genesis}` === accountKey)
    )
      return;
    setVaultAccounts([...oldAccounts, account]);
  });

const ScanAccount: FC<{ onClose: () => void }> = ({ onClose }) => (
  <QrCamera
    onRead={useCallback(
      (res) => {
        // Expected format: `substrate:${Addr}:${genesis}`
        const split = res.split(":");
        if (
          split[0] !== "substrate" ||
          split.length != 3 ||
          !split[2].startsWith("0x")
        ) {
          throw new Error("Invalid QR");
        }
        const [, address, genesis] = split;
        const account = getSs58AddressInfo(address);
        if (!account.isValid) {
          throw new Error("Invalid QR");
        }

        scannedAccount({
          address,
          genesis,
        });
        onClose();
      },
      [onClose]
    )}
  />
);
