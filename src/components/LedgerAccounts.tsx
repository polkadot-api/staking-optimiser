import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { setAccountSource } from "@/state/account";
import {
  AlreadyInUseError,
  getLedgerAccounts,
  ledgerAccounts$,
  setLedgerAccounts,
  type LedgerAccount,
} from "@/state/ledger";
import { useStateObservable } from "@react-rxjs/core";
import { ChevronLeft, Trash2, Usb } from "lucide-react";
import { useEffect, useState, type FC, type ReactElement } from "react";
import { TotalBalance } from "./AccountBalance";
import { Checkbox } from "./ui/checkbox";

export const LedgerAccounts: FC<{
  setContent: (element: ReactElement | null) => void;
}> = ({ setContent }) => {
  const ledgerAccounts = useStateObservable(ledgerAccounts$);
  useEffect(() => {
    if (ledgerAccounts.length === 0) {
      setContent(
        <ImportAccounts
          onClose={(accounts) =>
            setContent(
              accounts.length ? (
                <LedgerAccounts setContent={setContent} />
              ) : null
            )
          }
        />
      );
    }
  }, [ledgerAccounts, setContent]);

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
                <AddressIdentity addr={acc.address} />
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
        <Button
          type="button"
          onClick={() =>
            setContent(
              <ImportAccounts
                onClose={() =>
                  setContent(<LedgerAccounts setContent={setContent} />)
                }
              />
            )
          }
        >
          <Usb />
          Import accounts
        </Button>
      </div>
    </div>
  );
};

const PAGE_SIZE = 5;
const ImportAccounts: FC<{ onClose: (accounts: LedgerAccount[]) => void }> = ({
  onClose,
}) => {
  const ledgerAccounts = useStateObservable(ledgerAccounts$);
  const [page, setPage] = useState(0);
  const [pageAccounts, setPageAccounts] = useState<LedgerAccount[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const idxs = new Array(PAGE_SIZE)
      .fill(0)
      .map((_, i) => page * PAGE_SIZE + i);
    setError(null);
    setPageAccounts(null);

    getLedgerAccounts(idxs).then(
      (accounts) => {
        setPageAccounts(accounts);
      },
      (ex) => {
        if (ex instanceof AlreadyInUseError) {
          console.error(ex);
          // This happens when fetching too many pages at once. We don't want to show that error
          return;
        }
        setError(ex.message);
      }
    );
  }, [page]);

  return (
    <div className="space-y-2">
      {pageAccounts ? (
        <ul className="space-y-2">
          {pageAccounts.map((acc) => (
            <li
              key={`${acc.address}-${acc.deviceId}-${acc.index}`}
              className="flex gap-2 items-center"
            >
              <div className="text-xs text-muted-foreground">{acc.index}.</div>
              <Checkbox
                checked={ledgerAccounts.some(
                  (v) =>
                    v.deviceId === acc.deviceId &&
                    v.index === acc.index &&
                    v.address === acc.address
                )}
                onCheckedChange={(chk) => {
                  if (chk) {
                    setLedgerAccounts([...ledgerAccounts, acc]);
                  } else {
                    setLedgerAccounts(
                      ledgerAccounts.filter(
                        (v) =>
                          !(
                            v.deviceId === acc.deviceId &&
                            v.index === acc.index &&
                            v.address === acc.address
                          )
                      )
                    );
                  }
                }}
              />
              <AddressIdentity addr={acc.address} />
              <TotalBalance addr={acc.address} />
            </li>
          ))}
        </ul>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <div>Loading…</div>
      )}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => onClose(ledgerAccounts)}
          variant="secondary"
          type="button"
        >
          <ChevronLeft />
          Back
        </Button>
        {pageAccounts ? (
          <Button
            onClick={() => setPage((p) => p + 1)}
            variant="secondary"
            type="button"
          >
            Next Page
          </Button>
        ) : null}
      </div>
    </div>
  );
};
