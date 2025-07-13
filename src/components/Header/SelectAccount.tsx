import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { selectedAccount$ } from "@/state/account";
import { identity$ } from "@/state/identity";
import { withSubscribe } from "@/util/rxjs";
import { sliceMiddleAddr } from "@/util/ss58";
import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { AccountId } from "polkadot-api";
import { useState, type ReactElement } from "react";
import { map, switchMap } from "rxjs";
import { Button } from "../ui/button";
import { ConnectSource } from "./ConnectSource";
import { AccountSelector } from "./AccountSelector";

const [openChange$, setOpen] = createSignal<boolean>();
export const openSelectAccount = () => setOpen(true);
const open$ = state(openChange$, false);

const selectedAccountName$ = selectedAccount$.pipeState(
  switchMap((v) => {
    if (!v) return [null];

    if (v.type === "extension") {
      return [
        {
          name: v.value.name || null,
          address: v.value.address,
        },
      ];
    }

    return identity$(v.value).pipe(
      map((id) => ({
        name: id ? (id.value + id.subId ? `/${id.subId}` : "") : null,
        address: v.value,
      }))
    );
  })
);

export const SelectAccount = withSubscribe(() => {
  const open = useStateObservable(open$);
  const selectedAccount = useStateObservable(selectedAccount$);
  const accountName = useStateObservable(selectedAccountName$);

  // Experimenting a bit but... who says I can't do this?
  const [content, setContent] = useState<ReactElement | null>(null);

  const renderTrigger = () => {
    if (!selectedAccount || !accountName) return <Button>Connect</Button>;

    const publicKey =
      selectedAccount.type === "address"
        ? AccountId().enc(selectedAccount.value)
        : selectedAccount.value.polkadotSigner.publicKey;

    return (
      <Button variant="outline">
        <PolkadotIdenticon publicKey={publicKey} className="size-6" />
        {accountName.name ? (
          <div>{accountName.name}</div>
        ) : (
          <div className="text-sm text-foreground/60">
            {sliceMiddleAddr(accountName.address)}
          </div>
        )}
      </Button>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setTimeout(() => setContent(null), 500);
        }
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {content ?? (
            <>
              <AccountSelector />
              <ConnectSource setContent={setContent} />
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
});
