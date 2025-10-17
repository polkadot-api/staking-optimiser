import { TransactionButton } from "@/components/Transactions";
import { accountStatus$, selectedAccountAddr$ } from "@/state/account";
import { stakingSdk$ } from "@/state/chain";
import { useStateObservable } from "@react-rxjs/core";
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  withLatestFrom,
} from "rxjs";
import { bond$ } from "./BondInput";
import { minBond$ } from "./MinBondingAmounts";
import { MAX_VALIDATORS, selectedValidators$ } from "./pickValidators.state";

export const NominateButton = () => {
  const selection = useStateObservable(selectedValidators$);
  const bond = useStateObservable(bond$);
  const minBond = useStateObservable(minBond$);
  const status = useStateObservable(accountStatus$);
  const maxBond = status?.nomination.maxBond ?? 0n;

  const canNominate =
    bond != null &&
    bond >= minBond &&
    bond <= maxBond &&
    selection.size > 0 &&
    selection.size <= MAX_VALIDATORS;

  return (
    <TransactionButton disabled={!canNominate} createTx={createNominateTx}>
      Nominate
    </TransactionButton>
  );
};

const nominateTx$ = combineLatest([
  selectedAccountAddr$.pipe(filter((v) => v != null)),
  bond$.pipe(filter((v) => v != null)),
  selectedValidators$,
]).pipe(
  withLatestFrom(stakingSdk$),
  map(([[nominator, bond, selectedValidators], sdk]) =>
    sdk.upsertNomination(nominator, {
      bond,
      validators: Array.from(selectedValidators),
    })
  )
);

const createNominateTx = async () => firstValueFrom(nominateTx$);
