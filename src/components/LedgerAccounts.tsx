import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { setAccountSource } from "@/state/account";
import {
  getLedgerAccount,
  ledgerAccounts$,
  setLedgerAccounts,
} from "@/state/ledger";
import { sliceMiddleAddr } from "@/util/ss58";
import { useStateObservable } from "@react-rxjs/core";
import { ChevronLeft, Loader2, Trash2, Usb } from "lucide-react";
import { useRef, useState, type FC, type ReactElement } from "react";
import { toast } from "react-toastify";
import { TotalBalance } from "./AccountBalance";
import { Input } from "./ui/input";

export const LedgerAccounts: FC<{
  setContent: (element: ReactElement | null) => void;
}> = ({ setContent }) => {
  const ledgerAccounts = useStateObservable(ledgerAccounts$);
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const path = useRef<HTMLInputElement | null>(null);

  const getNextIdx = () => {
    const existingIdxs = new Set(
      ledgerAccounts
        .filter((v) => deviceId == null || v.deviceId == deviceId)
        .map((v) => v.index)
    );
    let idx = 0;
    while (existingIdxs.has(idx)) idx++;
    return idx;
  };

  const [importing, setImporting] = useState(false);
  const importNext = async () => {
    let idx: number | null = null;
    if (path.current?.value) {
      idx = Number(path.current.value);
      if (Number.isNaN(idx)) {
        idx = null;
      }
    }

    setImporting(true);
    try {
      idx = idx ?? getNextIdx();
      const account = await getLedgerAccount(idx);
      setDeviceId(account.deviceId);
      if (
        ledgerAccounts.some(
          (acc) =>
            acc.deviceId === account.deviceId && acc.index === account.index
        )
      ) {
        toast.info(
          `Account ${sliceMiddleAddr(account.address)} is already imported`
        );
        return;
      }
      setLedgerAccounts([...ledgerAccounts, account]);
      if (path.current) path.current.value = "";
    } catch (ex: any) {
      toast.error(ex.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {ledgerAccounts.length ? (
        <div>
          <h3 className="font-medium text-muted-foreground">Added addresses</h3>
          <ul className="space-y-2">
            {ledgerAccounts.map((acc) => (
              <li
                key={`${acc.address}-${acc.deviceId}-${acc.index}`}
                className="flex gap-2 items-center"
              >
                <Button
                  variant="outline"
                  className="text-destructive"
                  type="button"
                  onClick={() =>
                    setLedgerAccounts(ledgerAccounts.filter((v) => acc !== v))
                  }
                >
                  <Trash2 />
                </Button>
                <AddressIdentity className="flex-none" addr={acc.address} />
                <span className="text-xs text-muted-foreground flex-1">
                  ({acc.index})
                </span>
                <TotalBalance addr={acc.address} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAccountSource({
                      type: "ledger",
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
      <div className="flex items-center justify-between flex-wrap-reverse gap-2">
        <Button
          onClick={() => setContent(null)}
          variant="secondary"
          type="button"
        >
          <ChevronLeft />
          Back
        </Button>
        <div className="flex gap-2">
          <Input ref={path} type="text" placeholder="index (optional)" />
          <Button type="button" onClick={importNext} disabled={importing}>
            {importing ? <Loader2 className="animate-spin" /> : <Usb />}
            Import next account
          </Button>
        </div>
      </div>
    </div>
  );
};
