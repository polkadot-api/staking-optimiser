import { accountStatus$, selectedAccountAddr$ } from "@/state/account"
import { bond$ } from "./BondInput"
import { minBond$ } from "../MinBondingAmounts"
import {
  MAX_VALIDATORS,
  selectedValidators$,
} from "../PickValidators/pickValidators.state"
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  withLatestFrom,
} from "rxjs"
import { state, useStateObservable } from "@react-rxjs/core"
import { payeePicker$ } from "./PayeePicker"
import { TransactionButton } from "@/components/Transactions"
import { stakingSdk$ } from "@/state/chain"

export const nominateButton$ = state(
  combineLatest([
    selectedValidators$,
    bond$,
    minBond$,
    accountStatus$,
    payeePicker$,
  ] as const),
)

export const NominateButton = () => {
  const [selection, bond, minBond, status, payee] =
    useStateObservable(nominateButton$)
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
  selectedAccountAddr$.pipe(filter(Boolean)),
  bond$.pipe(filter((v) => v != null)),
  selectedValidators$,
  payeePicker$,
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
