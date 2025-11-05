import { accountStatus$ } from "@/state/account"
import { StakingRewardDestination } from "@polkadot-api/descriptors"
import { useStateObservable } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { map, startWith, switchMap } from "rxjs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AccountInput } from "@/components/AccountInput"

const [payeeChange$, setPayee] = createSignal<StakingRewardDestination>()

const visiblePayeeTypes: StakingRewardDestination["type"][] = [
  "Stash",
  "Staked",
  "Account",
]

export const payeePicker$ = accountStatus$.pipeState(
  map(
    (account) => account?.nomination.payee ?? StakingRewardDestination.Staked(),
  ),
  switchMap((initialPayee) => payeeChange$.pipe(startWith(initialPayee))),
)

export const PayeePicker = () => {
  const selectedPayee = useStateObservable(payeePicker$)

  return (
    <div className="flex gap-2 items-center">
      <p className="text-sm font-medium">Rewards destination</p>
      <Select
        value={selectedPayee.type}
        onValueChange={(value) => {
          const type = value as StakingRewardDestination["type"]
          if (type === "Account") {
            setPayee(StakingRewardDestination.Account(""))
          } else {
            setPayee({ type, value: undefined })
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Destination" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Staked">Compounded</SelectItem>
          <SelectItem value="Stash">Nominator account</SelectItem>
          <SelectItem value="Account">Other account</SelectItem>
          {visiblePayeeTypes.includes(selectedPayee.type) ? null : (
            <SelectItem value={selectedPayee.type}>
              {selectedPayee.type}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {selectedPayee.type === "Account" ? (
        <AccountInput
          value={selectedPayee.value === "" ? null : selectedPayee.value}
          onChange={(value) =>
            setPayee(StakingRewardDestination.Account(value))
          }
        />
      ) : null}
    </div>
  )
}
