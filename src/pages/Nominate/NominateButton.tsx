import { TransactionButton } from "@/components/Transactions";
import { accountStatus$ } from "@/state/account";
import { stakingApi$ } from "@/state/chain";
import {
  MultiAddress,
  StakingRewardDestination,
} from "@polkadot-api/descriptors";
import { useStateObservable } from "@react-rxjs/core";
import type { Transaction } from "polkadot-api";
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

type AnyTransaction = Transaction<any, any, any, any>;
const nominateTx$ = combineLatest([
  accountStatus$.pipe(filter((v) => v != null)),
  bond$.pipe(filter((v) => v != null)),
  selectedValidators$,
]).pipe(
  withLatestFrom(stakingApi$),
  map(([[status, bond, selectedValidators], api]) => {
    const txs: Array<AnyTransaction> = [];

    const bondDiff = bond - status.nomination.currentBond;
    if (bondDiff > 0) {
      if (status.nomination.totalLocked == 0n) {
        txs.push(
          api.tx.Staking.bond({
            value: bond,
            payee: StakingRewardDestination.Stash(),
          })
        );
      } else {
        const unlocking = status.nomination.unlocks.reduce(
          (acc, v) => acc + v.value,
          0n
        );
        const rebond = unlocking < bondDiff ? unlocking : bondDiff;
        const bondAfterRebond = bondDiff - rebond;

        if (rebond > 0) {
          txs.push(
            api.tx.Staking.rebond({
              value: rebond,
            })
          );
        }
        if (bondAfterRebond > 0) {
          txs.push(
            api.tx.Staking.bond_extra({
              max_additional: bondAfterRebond,
            })
          );
        }
      }
    } else if (bondDiff < 0) {
      txs.push(api.tx.Staking.unbond({ value: -bondDiff }));
    }

    const oldSelection = status.nomination.nominating?.validators ?? [];
    const hasDifferentValidators =
      oldSelection.length != selectedValidators.size ||
      oldSelection.some((old) => !selectedValidators.has(old));
    if (hasDifferentValidators) {
      txs.push(
        api.tx.Staking.nominate({
          targets: Array.from(selectedValidators).map((v) =>
            MultiAddress.Id(v)
          ),
        })
      );
    }

    const calls = txs.map((tx) => tx.decodedCall);
    console.log(calls);

    if (txs.length === 1) {
      return txs[0];
    }
    return api.tx.Utility.batch_all({
      calls,
    });
  })
);

const createNominateTx = async (): Promise<AnyTransaction> =>
  firstValueFrom(nominateTx$);
