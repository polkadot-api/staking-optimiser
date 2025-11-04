import { AccountInput } from "@/components/AccountInput"
import { TransactionButton } from "@/components/Transactions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { accountStatus$, selectedAccountAddr$ } from "@/state/account"
import { stakingSdk$ } from "@/state/chain"
import { StakingRewardDestination } from "@polkadot-api/descriptors"
import { useStateObservable } from "@react-rxjs/core"
import { createSignal } from "@react-rxjs/utils"
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  startWith,
  switchMap,
  withLatestFrom,
} from "rxjs"
import { bond$ } from "./BondInput"
import { minBond$ } from "./MinBondingAmounts"
import {
  MAX_VALIDATORS,
  selectedValidators$,
} from "./PickValidators/pickValidators.state"

export default function ManageNominationParams() {
  return (
    <div className="flex justify-between items-center">
      <PayeePicker />
      <NominateButton />
    </div>
  )
}

const onChainPayee$ = accountStatus$.pipeState(
  map((account) => account?.nomination.payee ?? null),
)

const [payeeChange$, setPayee] = createSignal<StakingRewardDestination>()
const selectedPayee$ = onChainPayee$.pipeState(
  map((v) => v ?? StakingRewardDestination.Stash()),
  switchMap((initialPayee) => payeeChange$.pipe(startWith(initialPayee))),
)

const visiblePayeeTypes: StakingRewardDestination["type"][] = [
  "Stash",
  "Staked",
  "Account",
]
const PayeePicker = () => {
  const selectedPayee = useStateObservable(selectedPayee$)

  return (
    <div className="flex gap-2 items-center">
      <div>Rewards to:</div>
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
          <SelectItem value="Stash">Nominator account</SelectItem>
          <SelectItem value="Staked">Compounded</SelectItem>
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

const NominateButton = () => {
  const selection = useStateObservable(selectedValidators$)
  const bond = useStateObservable(bond$)
  const minBond = useStateObservable(minBond$)
  const status = useStateObservable(accountStatus$)
  const payee = useStateObservable(selectedPayee$)
  const maxBond = status?.nomination.maxBond ?? 0n

  const canNominate =
    bond != null &&
    bond >= minBond &&
    bond <= maxBond &&
    selection.size > 0 &&
    selection.size <= MAX_VALIDATORS &&
    // Don't allow to nominate if account was not set
    (payee.type != "Account" || payee.value != "")

  return (
    <TransactionButton disabled={!canNominate} createTx={createNominateTx}>
      Nominate
    </TransactionButton>
  )
}

const nominateTx$ = combineLatest([
  selectedAccountAddr$.pipe(filter((v) => v != null)),
  bond$.pipe(filter((v) => v != null)),
  selectedValidators$,
  selectedPayee$,
]).pipe(
  withLatestFrom(stakingSdk$),
  map(([[nominator, bond, selectedValidators, payee], sdk]) =>
    sdk.upsertNomination(nominator, {
      bond,
      validators: Array.from(selectedValidators),
      payee,
    }),
  ),
)

const createNominateTx = async () => firstValueFrom(nominateTx$)
