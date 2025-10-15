import { TransactionButton } from "@/components/Transactions";
import { accountStatus$, selectedSignerAccount$ } from "@/state/account";
import { useStateObservable } from "@react-rxjs/core";
import { bond$ } from "./BondInput";
import { minBond$ } from "./MinBondingAmounts";
import { MAX_VALIDATORS, selectedValidators$ } from "./pickValidators.state";
import type { Transaction } from "polkadot-api";
import {
  combineLatest,
  filter,
  firstValueFrom,
  map,
  withLatestFrom,
} from "rxjs";
import { stakingApi$ } from "@/state/chain";
import {
  MultiAddress,
  StakingRewardDestination,
} from "@polkadot-api/descriptors";

export const NominateButton = () => {
  const account = useStateObservable(selectedSignerAccount$);
  const selection = useStateObservable(selectedValidators$);
  const bond = useStateObservable(bond$);
  const minBond = useStateObservable(minBond$);
  const status = useStateObservable(accountStatus$);
  const maxBond = status
    ? status.balance.spendable + status.nomination.activeBond
    : 0n;

  const canNominate =
    bond != null &&
    bond >= minBond &&
    bond <= maxBond &&
    selection.size > 0 &&
    selection.size <= MAX_VALIDATORS;

  return (
    <TransactionButton
      disabled={!canNominate}
      createTx={createNominateTx}
      signer={account?.polkadotSigner}
    >
      Nominate
    </TransactionButton>
  );
};

type AnyTransaction = Transaction<any, any, any, any>;
const nominateTx$ = combineLatest([
  accountStatus$.pipe(filter((v) => v != null)),
  bond$.pipe(filter((v) => v != null)),
  selectedValidators$,
]).pipe(
  withLatestFrom(stakingApi$),
  map(([[status, bond, selectedValidators], api]) => {
    const transactions: Array<AnyTransaction> = [];

    const bondDiff = bond - status.nomination.currentBond;
    if (bondDiff > 0) {
      if (status.nomination.currentBond) {
        transactions.push(
          api.tx.Staking.bond_extra({ max_additional: bondDiff })
        );
      } else {
        transactions.push(
          api.tx.Staking.bond({
            value: bond,
            payee: StakingRewardDestination.Stash(),
          })
        );
      }
    } else if (bondDiff < 0) {
      transactions.push(api.tx.Staking.unbond({ value: -bondDiff }));
    }

    const oldSelection = status.nomination.nominating?.validators ?? [];
    const hasDifferentValidators =
      oldSelection.length != selectedValidators.size ||
      oldSelection.some((old) => !selectedValidators.has(old));
    if (hasDifferentValidators) {
      transactions.push(
        api.tx.Staking.nominate({
          targets: Array.from(selectedValidators).map((v) =>
            MultiAddress.Id(v)
          ),
        })
      );
    }

    if (transactions.length === 1) {
      return transactions[0];
    }
    return api.tx.Utility.batch_all({
      calls: transactions.map((tx) => tx.decodedCall),
    });
  })
);

const createNominateTx = async (): Promise<AnyTransaction> =>
  firstValueFrom(nominateTx$);
