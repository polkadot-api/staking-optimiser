import { selectedSignerAccount$ } from "@/state/account";
import { createLocalStorageState } from "@/util/rxjs";
import type { AsyncTransaction } from "@polkadot-api/sdk-staking";
import { Checkbox } from "@polkahub/ui-components";
import { shareLatest, useStateObservable } from "@react-rxjs/core";
import { Eye, Loader2, Zap } from "lucide-react";
import {
  InvalidTxError,
  type PolkadotSigner,
  type Transaction,
  type TxEvent,
} from "polkadot-api";
import {
  lazy,
  useState,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";
import { from, lastValueFrom, switchMap, type Observable } from "rxjs";
import { DialogButton } from "./DialogButton";
import { Button } from "./ui/button";

const toastModule = import("react-toastify");

const ToastContainer = lazy(() =>
  toastModule.then((mod) => ({ default: mod.ToastContainer }))
);

// Error invalid fee keeps the toast open
function trackTransaction(tx$: Observable<TxEvent>) {
  return from(toastModule).pipe(
    switchMap(({ toast }) => {
      const shared$ = tx$.pipe(shareLatest());

      let id = toast.loading("Signing transaction…", {
        autoClose: false,
      });
      shared$.subscribe({
        next: (res) => {
          if (res.type === "signed") {
            toast.update(id, {
              render: "Sending transaction…",
            });
          } else if (res.type === "txBestBlocksState" && res.found) {
            toast.update(
              id,
              res.ok
                ? {
                    render: "Waiting for confirmation…",
                  }
                : {
                    render:
                      "Transaction included in a block but is failing: " +
                      JSON.stringify(res.dispatchError),
                  }
            );
          } else if (res.type === "finalized") {
            // Can't toast.update the type of toast :(
            toast.dismiss(id);

            if (!res.ok) {
              id = toast.error(
                "Transaction failed: " + JSON.stringify(res.dispatchError),
                {
                  autoClose: false,
                }
              );
              return;
            }

            id = toast.success("Transaction succeeded!");
          }
        },
        error: (error) => {
          toast.dismiss(id);
          if (error instanceof InvalidTxError) {
            toast.error("Transaction failed: " + JSON.stringify(error.error), {
              autoClose: false,
            });
          } else {
            toast.error("Transaction failed: " + error.message, {
              autoClose: false,
            });
          }
        },
      });

      return shared$;
    })
  );
}

export const Transactions = () => <ToastContainer position="bottom-right" />;

const useSingleTransaction = () => {
  const [isPending, setIsPending] = useState(false);

  const startTx = async (tx$: Observable<TxEvent>) => {
    setIsPending(true);
    try {
      await lastValueFrom(trackTransaction(tx$));
    } finally {
      setIsPending(false);
    }
  };

  return [isPending, startTx] as const;
};

const [hasAccepted$, setHasAccepted] = createLocalStorageState(
  "tos-accepted",
  false
);

type ButtonProps = typeof Button extends ComponentType<infer R> ? R : never;

type Awaitable<T> = T | Promise<T>;

export const TransactionButton: FC<
  ButtonProps & {
    createTx: () => Awaitable<
      Transaction<any, any, any, any> | AsyncTransaction | null
    >;
    onSuccess?: () => void;
    onError?: (err: any) => void;
  }
> = ({ createTx, onSuccess, onError, ...props }) => {
  const hasAccepted = useStateObservable(hasAccepted$);
  const account = useStateObservable(selectedSignerAccount$);
  const [isOngoing, trackTx] = useSingleTransaction();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signer = account?.polkadotSigner;

  const sign = async () => {
    setIsSubmitting(true);
    try {
      const tx = await createTx();
      if (!tx) return;
      await trackTx(tx.signSubmitAndWatch(signer!));
      onSuccess?.();
    } catch (ex) {
      console.error(ex);
      onError?.(ex);
    } finally {
      setIsSubmitting(false);
    }
  };

  return hasAccepted ? (
    <AcceptedTransactionButton
      {...props}
      isOngoing={isOngoing}
      disabled={isSubmitting || props.disabled}
      onClick={sign}
    />
  ) : (
    <TermsOfServiceButton {...props} sign={sign} />
  );
};

const TermsOfServiceButton: FC<PropsWithChildren<{ sign: () => void }>> = ({
  children,
  sign,
}) => {
  const account = useStateObservable(selectedSignerAccount$);
  const signer = account?.polkadotSigner;
  const [accepted, setAccepted] = useState(false);

  return (
    <DialogButton
      title="Terms of service"
      content={({ close }) => (
        <div className="space-y-2 text-sm">
          <p>
            By using this application, you acknowledge and agree to the terms of{" "}
            <a
              className="underline"
              target="blank"
              href="https://github.com/polkadot-api/staking-optimiser/blob/main/LICENSE"
            >
              its license
            </a>
            .
          </p>
          <p>
            This application and its developers provide <b>no warranty</b> and
            accept <b>no liability</b> for any losses or damages arising from
            its use. Always <b>verify all information shown</b>, and{" "}
            <b>check any transactions</b> before signing them.
          </p>
          <label className="flex items-center gap-1">
            <Checkbox
              required
              checked={accepted}
              onCheckedChange={(evt) => setAccepted(evt === true)}
            />
            I have read and agree to the above
          </label>
          <div className="flex justify-between">
            <Button
              disabled={!accepted}
              onClick={() => {
                setHasAccepted(true);
                sign();
              }}
            >
              Accept
            </Button>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    >
      {children}
      <TxButtonLogo signer={signer} />
    </DialogButton>
  );
};

const AcceptedTransactionButton: FC<
  PropsWithChildren<ButtonProps & { isOngoing: boolean }>
> = ({ children, isOngoing, ...props }) => {
  const account = useStateObservable(selectedSignerAccount$);
  const signer = account?.polkadotSigner;

  return (
    <Button {...props} disabled={!signer || isOngoing || props.disabled}>
      {children}
      <TxButtonLogo isOngoing={isOngoing} signer={signer} />
    </Button>
  );
};

const TxButtonLogo: FC<{ isOngoing?: boolean; signer?: PolkadotSigner }> = ({
  isOngoing,
  signer,
}) =>
  isOngoing ? <Loader2 className="animate-spin" /> : signer ? <Zap /> : <Eye />;
