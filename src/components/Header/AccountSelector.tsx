import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  connectedExtensionsAccounts$,
  selectedAccount$,
  selectedAccountAddr$,
  setAccountSource,
} from "@/state/account";
import { state, useStateObservable } from "@react-rxjs/core";
import { ChevronsUpDown, X } from "lucide-react";
import { useState, type FC } from "react";
import { combineLatest, map } from "rxjs";
import { twMerge } from "tailwind-merge";
import { AddressIdentity } from "../AddressIdentity";
import { readOnlyAddresses$ } from "./ManageAddresses";

type SelectableAccount = {
  address: string;
  name?: string;
  onSelect: () => void;
};

const groupLabels: Record<string, string> = {
  readOnly: "Read Only",
};

const availableAccountGroups$ = state(
  combineLatest({
    readOnly: readOnlyAddresses$.pipe(
      map((v) =>
        v.map(
          (address): SelectableAccount => ({
            address,
            onSelect: () =>
              setAccountSource({
                type: "address",
                value: address,
              }),
          })
        )
      )
    ),
    extensions: connectedExtensionsAccounts$.pipe(
      map((extensions) =>
        extensions.map(({ id, accounts }): [string, SelectableAccount[]] => [
          id,
          accounts.map((account) => ({
            address: account.address,
            name: account.name,
            onSelect: () =>
              setAccountSource({
                type: "extension",
                value: {
                  id,
                  address: account.address,
                },
              }),
          })),
        ])
      )
    ),
  }).pipe(
    map(({ extensions, ...rest }) => {
      return [...extensions, ...Object.entries(rest)]
        .filter(([, accounts]) => accounts.length > 0)
        .map(([id, accounts]) => ({
          name: groupLabels[id] ?? id,
          accounts,
        }));
    })
  )
);

export const AccountSelector: FC<{
  className?: string;
}> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const address = useStateObservable(selectedAccountAddr$);
  const account = useStateObservable(selectedAccount$);
  const groups = useStateObservable(availableAccountGroups$);

  const hintedName =
    account?.type === "extension" ? account.value.name : undefined;

  if (!groups.length && !account) return null;

  return (
    <div>
      <h3 className="font-medium">Select Account</h3>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 overflow-hidden">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={twMerge(
                "flex w-full shrink justify-between overflow-hidden border border-border bg-background h-12",
                className
              )}
            >
              {address != null ? (
                <AddressIdentity
                  addr={address}
                  name={hintedName}
                  copyable={false}
                />
              ) : (
                <span className="opacity-80">Select…</span>
              )}
              <ChevronsUpDown size={14} className="opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          {account ? (
            <button
              className="cursor-pointer"
              onClick={() => setAccountSource(null)}
            >
              <X className="text-muted-foreground" size={16} />
            </button>
          ) : null}
        </div>
        <PopoverContent
          className="p-0"
          style={{
            width:
              "calc(min(var(--spacing) * 96, var(--radix-popper-available-width)))",
          }}
        >
          <Command>
            <CommandInput placeholder="Search and select…" />
            <CommandList>
              <CommandEmpty>
                <div className="text-foreground/50">
                  The searched value doesn't match the filter
                </div>
              </CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.name} heading={group.name}>
                  {group.accounts.map((account, i) => (
                    <AccountOption
                      key={i}
                      account={account.address}
                      name={account.name}
                      group={group.name}
                      onSelect={() => {
                        account.onSelect();
                        setOpen(false);
                      }}
                    />
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const AccountOption: FC<{
  account: string;
  group: string;
  name?: string;
  onSelect: () => void;
}> = ({ account, group, name, onSelect }) => (
  <CommandItem
    keywords={[group, name].filter((v) => v != null)}
    value={account}
    onSelect={onSelect}
    className="flex flex-row items-center gap-2 p-1"
  >
    <AddressIdentity addr={account} name={name} copyable={false} />
  </CommandItem>
);
