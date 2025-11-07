import { HintTooltip, TextHintTooltip } from "@/components/HintTooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { accountStatus$ } from "@/state/account"
import { StakingRewardDestination } from "@polkadot-api/descriptors"
import { useStateObservable } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import { AddressInput } from "polkahub"
import { map, startWith, switchMap } from "rxjs"

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
      <HintTooltip>
        <p>Choose how you want to receive your staking rewards:</p>
        <p>
          <strong>Compounded</strong>: Rewards are automatically added to your
          bonded amount.
        </p>
        <p>
          <strong>Nominator account</strong>: Rewards are sent to your free
          (spendable) balance.
        </p>
        <p>
          <strong>Other account</strong>: Send rewards to a different account of
          your choice.
        </p>
      </HintTooltip>
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
        <AddressInput
          value={selectedPayee.value === "" ? null : selectedPayee.value}
          onChange={(value) =>
            setPayee(StakingRewardDestination.Account(value ?? ""))
          }
          className="w-64"
          triggerClassName="h-9"
        />
      ) : null}
    </div>
  )
}
