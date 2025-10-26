import { cn } from "@/lib/utils";
import { selectedAccountPlugin } from "@/state/account";
import { identity$ } from "@/state/identity";
import { codeSplit } from "@/util/codeSplit";
import { withSubscribe } from "@/util/rxjs";
import { sliceMiddleAddr } from "@/util/ss58";
import { PolkadotIdenticon } from "@polkadot-api/react-components";
import { state, useStateObservable } from "@react-rxjs/core";
import { createSignal } from "@react-rxjs/utils";
import { AccountId } from "polkadot-api";
import { useSelectedAccount } from "polkahub";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import { map, switchMap } from "rxjs";
import { Button } from "../ui/button";

const [openChange$, setOpen] = createSignal<boolean>();
export const openSelectAccount = () => setOpen(true);
const open$ = state(openChange$, false);

const selectedAccountName$ = selectedAccountPlugin.selectedAccount$.pipeState(
  switchMap((v) => {
    if (!v) return [null];

    if (v.name) {
      return [
        {
          name: v.name || null,
          address: v.address,
        },
      ];
    }

    return identity$(v.address).pipe(
      map((id) => ({
        name: id ? id.value + (id.subId ? `/${id.subId}` : "") : null,
        address: v.address,
      }))
    );
  })
);

const Trigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button> & {
    loading?: boolean;
  }
>(({ loading, ...props }, ref) => {
  const [selectedAccount] = useSelectedAccount();
  const accountName = useStateObservable(selectedAccountName$);

  if (!selectedAccount || !accountName)
    return (
      <Button ref={ref} {...props}>
        Connect
      </Button>
    );

  const publicKey = AccountId().enc(selectedAccount.address);

  return (
    <Button
      ref={ref}
      variant="outline"
      {...props}
      className={cn(loading ? "cursor-wait" : null, props.className)}
    >
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
});

const payload = Promise.all([
  import("@/components/ui/dialog"),
  import("./ConnectSource"),
  import("./AccountSelector"),
]);
export const SelectAccount = withSubscribe(
  codeSplit(
    payload,
    () => <Trigger loading />,
    ({ payload }) => {
      const open = useStateObservable(open$);

      // Experimenting a bit but... who says I can't do this?
      const [content, setContent] = useState<ReactElement | null>(null);

      const [
        {
          Dialog,
          DialogBody,
          DialogContent,
          DialogHeader,
          DialogTitle,
          DialogTrigger,
        },
        { ConnectSource },
        { AccountSelector },
      ] = payload;

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
          <DialogTrigger asChild>
            <Trigger />
          </DialogTrigger>
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
    }
  )
);
