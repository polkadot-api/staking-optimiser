import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { polkaHub } from "@/state/polkahub"
import { useStateObservable } from "@react-rxjs/core"
import { Check, ChevronsUpDown } from "lucide-react"
import { getSs58AddressInfo, type SS58String } from "polkadot-api"
import { type FC, useState } from "react"
import { map } from "rxjs"
import { twMerge } from "tailwind-merge"
import { AddressIdentity } from "./AddressIdentity"

const hintedAccounts$ = polkaHub.availableAccounts$.pipeState(
  map(
    (accountsByExtension) =>
      new Map(
        Object.values(accountsByExtension).flatMap((accounts) =>
          accounts
            .map(
              (acc) =>
                [
                  acc.address,
                  {
                    name: acc.name,
                    address: acc.address,
                  },
                ] as const,
            )
            .filter(([acc]) => !acc.startsWith("0x")),
        ),
      ),
  ),
  map((map) => [...map.values()]),
)

export const AccountInput: FC<{
  value: SS58String | null
  onChange: (value: SS58String) => void
  className?: string
}> = ({ value, onChange, className }) => {
  const accounts = useStateObservable(hintedAccounts$)

  const [query, setQuery] = useState("")
  const queryInfo = getSs58AddressInfo(query)

  const [open, _setOpen] = useState(false)
  const setOpen = (value: boolean) => {
    _setOpen(value)
    setQuery("")
  }

  const hintedValue = value
    ? accounts.find((acc) => acc.address === value)
    : null
  const valueIsNew = hintedValue == null
  if (value !== null) {
    accounts.sort((a, b) =>
      a.address === value ? -1 : b.address === value ? 1 : 0,
    )
  }

  const onTriggerKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key.length === 1) {
      setOpen(true)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onKeyDown={onTriggerKeyDown}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={twMerge(
            "flex w-64 justify-between overflow-hidden px-2 border border-border bg-background",
            className,
          )}
        >
          {value != null ? (
            <AddressIdentity
              addr={value}
              name={hintedValue?.name}
              className="overflow-hidden"
              copyable={false}
            />
          ) : (
            <span className="opacity-80">Select…</span>
          )}
          <ChevronsUpDown size={14} className="opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <Command>
          <CommandInput
            placeholder="Filter or insert…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <div className="text-foreground/50">
                The value is not a valid Account ID
              </div>
            </CommandEmpty>
            <CommandGroup>
              {valueIsNew && value && (
                <AccountOption
                  account={value}
                  selected={true}
                  onSelect={() => setOpen(false)}
                />
              )}
              {accounts.map((account) => (
                <AccountOption
                  key={account.address}
                  account={account.address}
                  name={account.name}
                  selected={value ? value === account.address : false}
                  onSelect={() => {
                    onChange(account.address)
                    setOpen(false)
                  }}
                />
              ))}
              {queryInfo.isValid && (
                <AccountOption
                  account={query}
                  selected={value === query}
                  onSelect={() => {
                    onChange(query)
                    setOpen(false)
                  }}
                />
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const AccountOption: FC<{
  account: string
  selected: boolean
  name?: string
  onSelect: () => void
}> = ({ account, name, selected, onSelect }) => (
  <CommandItem
    keywords={name ? [name] : undefined}
    value={account}
    onSelect={onSelect}
    className="flex flex-row items-center gap-2 p-1"
  >
    <AddressIdentity addr={account} name={name} className="overflow-hidden" />
    <Check
      size={12}
      className={twMerge(
        "ml-auto shrink-0",
        selected ? "opacity-100" : "opacity-0",
      )}
    />
  </CommandItem>
)
