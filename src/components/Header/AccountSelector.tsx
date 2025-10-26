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
import { selectedAccountAddr$ } from "@/state/account";
import { plugins$, usePolkaHubContext, useSelectedAccount } from "polkahub";
import { state, useStateObservable } from "@react-rxjs/core";
import { ChevronsUpDown, X } from "lucide-react";
import { useState, type FC } from "react";
import { combineLatest, map, switchMap } from "rxjs";
import { twMerge } from "tailwind-merge";
import { AddressIdentity } from "../AddressIdentity";

const groupLabels: Record<string, string> = {
  readOnly: "Read Only",
  vault: "Vault",
};

const availableAccountGroups$ = state((id: string) =>
  plugins$(id).pipe(
    switchMap((plugins) =>
      combineLatest(
        plugins.map(
          (p) =>
            p.accountGroups$ ??
            p.accounts$.pipe(
              map((accounts) => ({ [groupLabels[p.id] ?? p.id]: accounts }))
            )
        )
      )
    ),
    map((extGroups) => {
      return extGroups.flatMap((groups) =>
        Object.entries(groups)
          .filter(([, accounts]) => accounts.length > 0)
          .map(([name, accounts]) => ({
            name,
            accounts,
          }))
      );
    })
  )
);

export const AccountSelector: FC<{
  className?: string;
}> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const address = useStateObservable(selectedAccountAddr$);
  const ctx = usePolkaHubContext();
  const [account, setAccount] = useSelectedAccount();
  const groups = useStateObservable(availableAccountGroups$(ctx.id));

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
                  name={account?.name}
                  copyable={false}
                />
              ) : (
                <span className="opacity-80">Select…</span>
              )}
              <ChevronsUpDown size={14} className="opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          {account ? (
            <button className="cursor-pointer" onClick={() => setAccount(null)}>
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
                        setAccount(account);
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
