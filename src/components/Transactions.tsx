import type { AsyncTransaction } from "@polkadot-api/sdk-staking";
import { shareLatest } from "@react-rxjs/core";
import { Loader2, Zap } from "lucide-react";
import {
  InvalidTxError,
  type PolkadotSigner,
  type Transaction,
  type TxEvent,
} from "polkadot-api";
import { lazy, useState, type ComponentType, type FC } from "react";
import { from, lastValueFrom, switchMap, type Observable } from "rxjs";
import { Button } from "./ui/button";

const toastModule = import("react-toastify");

const ToastContainer = lazy(() =>
  toastModule.then((mod) => ({ default: mod.ToastContainer }))
);

// Error invalid fee keeps the toast open
export function trackTransaction(tx$: Observable<TxEvent>) {
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

export const useSingleTransaction = () => {
  const [isPending, setIsPending] = useState(false);

  const startTx = async (tx$: Observable<TxEvent>) => {
    setIsPending(true);
    try {
      await lastValueFrom(trackTransaction(tx$));
    } catch (ex) {
      console.error(ex);
    }
    setIsPending(false);
  };

  return [isPending, startTx] as const;
};

type ButtonProps = typeof Button extends ComponentType<infer R> ? R : never;

type Awaitable<T> = T | Promise<T>;
export const TransactionButton: FC<
  ButtonProps & {
    createTx: () => Awaitable<
      Transaction<any, any, any, any> | AsyncTransaction | null
    >;
    signer: PolkadotSigner | null | undefined;
    onSuccess?: () => void;
    onError?: (err: any) => void;
  }
> = ({ createTx, signer, children, onSuccess, onError, ...props }) => {
  const [isOngoing, trackTx] = useSingleTransaction();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Button
      {...props}
      disabled={!signer || isOngoing || isSubmitting || props.disabled}
      onClick={async () => {
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
      }}
    >
      {children}
      {isOngoing ? <Loader2 className="animate-spin" /> : <Zap />}
    </Button>
  );
};
