import { AddressIdentity } from "@/components/AddressIdentity";
import { Button } from "@/components/ui/button";
import { selectedAccountPlugin } from "@/state/account";
import { selectedChain$, stakingApi$ } from "@/state/chain";
import { tokenDecimalsByChain, tokenSymbolByChain } from "@/state/chainConfig";
import { createState } from "@/util/rxjs";
import {
  createLedgerProvider,
  type LedgerAccount,
  type LedgerAccountInfo,
} from "polkahub";
import {
  useStateObservable,
  withDefault,
  type DefaultedStateObservable,
} from "@react-rxjs/core";
import { ChevronLeft, Trash2, Usb } from "lucide-react";
import { useEffect, type FC, type ReactElement } from "react";
import {
  catchError,
  combineLatest,
  concatMap,
  firstValueFrom,
  map,
  startWith,
  switchMap,
  take,
  timer,
} from "rxjs";
import { TotalBalance } from "./AccountBalance";
import { CardPlaceholder } from "./CardPlaceholder";
import { Checkbox } from "./ui/checkbox";

export const ledgerAccountProvider = createLedgerProvider(
  async () => {
    const module = await import("@ledgerhq/hw-transport-webhid");
    return module.default.create();
  },
  () =>
    firstValueFrom(
      combineLatest({
        chain: selectedChain$,
        // ledger: [ledger],
        // deviceId: ledger.ledgerSigner.deviceId(),
        ss58Format: stakingApi$.pipe(
          switchMap((v) => v.constants.System.SS58Prefix()),
          take(1)
        ),
      }).pipe(
        map(({ chain, ss58Format }) => ({
          decimals: tokenDecimalsByChain[chain],
          tokenSymbol: tokenSymbolByChain[chain],
          ss58Format,
        }))
      )
    )
);

export const LedgerAccounts: FC<{
  setContent: (element: ReactElement | null) => void;
}> = ({ setContent }) => {
  const ledgerAccounts = useStateObservable(ledgerAccountProvider.accounts$);
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
                  onClick={() => ledgerAccountProvider.removeAccount(acc)}
                >
                  <Trash2 />
                </Button>
                <AddressIdentity addr={acc.address} />
                <TotalBalance addr={acc.address} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    selectedAccountPlugin.setAccount(acc);
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

const [page$, setPage] = createState(0);
type PageAccounts = {
  accounts: Array<LedgerAccountInfo | null>;
  error: string | null;
};
const pageAccounts$: DefaultedStateObservable<PageAccounts> = page$.pipeState(
  map((page) =>
    new Array(PAGE_SIZE).fill(0).map((_, i) => page * PAGE_SIZE + i)
  ),
  concatMap((idxs) => {
    const value: PageAccounts = {
      accounts: idxs.map(() => null),
      error: null,
    };

    return timer(200).pipe(
      switchMap(() => ledgerAccountProvider.getLedgerAccounts$(idxs)),
      map((account, i) => {
        value.accounts[i] = account;

        return { ...value };
      }),
      startWith({ ...value }),
      catchError((ex) => [
        {
          ...value,
          error: ex.message,
        },
      ])
    );
  }),
  withDefault({
    accounts: new Array(PAGE_SIZE).fill(null),
    error: null,
  })
);

const ImportAccounts: FC<{ onClose: (accounts: LedgerAccount[]) => void }> = ({
  onClose,
}) => {
  const ledgerAccounts = useStateObservable(ledgerAccountProvider.accounts$);
  const page = useStateObservable(page$);
  const { accounts, error } = useStateObservable(pageAccounts$);

  const allLoading = accounts.every((v) => v == null);
  const allLoaded = accounts.every((v) => v != null);

  return (
    <div className="space-y-2">
      {error ? (
        <div>Error: {error}</div>
      ) : allLoading ? (
        <CardPlaceholder height={152} />
      ) : (
        <ul className="space-y-2">
          {accounts.map((acc, i) => (
            <li key={i} className="flex gap-2 items-center">
              {acc ? (
                <>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {acc.index}.
                  </div>
                  <Checkbox
                    checked={ledgerAccounts.some(
                      (v) =>
                        v.deviceId === acc.deviceId &&
                        v.index === acc.index &&
                        v.address === acc.address
                    )}
                    onCheckedChange={(chk) => {
                      if (chk) {
                        ledgerAccountProvider.addAccount(acc);
                      } else {
                        ledgerAccountProvider.removeAccount(acc);
                      }
                    }}
                  />
                  <AddressIdentity addr={acc.address} />
                  <TotalBalance addr={acc.address} />
                </>
              ) : (
                <div className="bg-muted w-full rounded shadow animate-pulse h-6" />
              )}
            </li>
          ))}
        </ul>
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
        {allLoaded ? (
          <Button
            onClick={() => setPage(page + 1)}
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
