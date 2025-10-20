import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { setAccountSource } from "@/state/account";
import {
  setVaultAccounts,
  vaultAccounts$,
  type VaultAccount,
} from "@/state/vault";
import { useStateObservable } from "@react-rxjs/core";
import { Trash2 } from "lucide-react";
import { useCallback, useState, type FC, type ReactElement } from "react";

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

import { createSignal } from "@react-rxjs/utils";
import { getSs58AddressInfo } from "polkadot-api";
import { frameLoop, frontalCamera, QRCanvas } from "qr/dom.js";
import { withLatestFrom } from "rxjs";
type QrCamera = Awaited<ReturnType<typeof frontalCamera>>;

const binaryToString = (value: Uint8Array) =>
  // new TextDecoder("latin1").decode(value);
  Array.from(value, (b) => String.fromCharCode(b)).join("");
const stringToBinary = (value: string) =>
  Uint8Array.from(value, (c) => c.charCodeAt(0) & 0xff);

const canvas = new QRCanvas(
  {},
  {
    textDecoder: binaryToString,
  }
);

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

const ScanAccount: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [error, setError] = useState<null | "camera" | "invalid_qr">(null);

  const ref = useCallback(
    (element: HTMLVideoElement) => {
      let stopped = false;
      let camera: QrCamera | null = null;
      async function showCamera() {
        camera = await frontalCamera(element);
        if (stopped) {
          setTimeout(() => camera?.stop(), 1000);
          camera = null;
          return;
        }
        if (!camera) {
          setError("camera");
          return;
        }

        const stop = frameLoop(() => {
          if (!camera || stopped) {
            stop();
            return;
          }

          const res = camera.readFrame(canvas);
          if (!res) return;

          // Expected format: `substrate:${Addr}:${genesis}`
          const split = res.split(":");
          if (
            split[0] !== "substrate" ||
            split.length != 3 ||
            !split[2].startsWith("0x")
          ) {
            setError("invalid_qr");
            return;
          }
          const [, address, genesis] = split;
          const account = getSs58AddressInfo(address);
          if (!account.isValid) {
            setError("invalid_qr");
            return;
          }

          scannedAccount({
            address,
            genesis,
          });
          camera.stop();
          stop();
          onClose();
        });
      }
      showCamera();

      return () => {
        stopped = true;
        camera?.stop();
      };
    },
    [onClose]
  );

  return (
    <div>
      <video ref={ref} />
      {error ? <div>Error!</div> : null}
    </div>
  );
};
