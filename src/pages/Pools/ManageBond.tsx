import { accountBalance$ } from "@/components/AccountBalance";
import { AlertCard } from "@/components/AlertCard";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, tokenDecimals$ } from "@/state/chain";
import { activeEraNumber$ } from "@/state/era";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state, useStateObservable } from "@react-rxjs/core";
import { useState } from "react";
import { firstValueFrom, switchMap } from "rxjs";

const minBond$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
  )
);

export const ManageBond = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$);
  const balance = useStateObservable(accountBalance$);
  const decimals = useStateObservable(tokenDecimals$);
  const minBond = useStateObservable(minBond$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);
  const currentEra = useStateObservable(activeEraNumber$);
  const [bond, setBond] = useState(poolStatus ? Number(poolStatus.bond) : 0);
  const [committedBond, setCommitedBond] = useState(bond);

  const [submitting, setSubmitting] = useState(false);

  if (!balance) return null;
  if (!poolStatus) return <div>TODO not in a pool</div>;

  const bigBond = isNaN(bond) ? 0n : BigInt(Math.round(bond));

  const currentUnbonding = poolStatus.unlocks
    .map((v) => v.value)
    .reduce((a, b) => a + b, 0n);
  const maxBond =
    balance.total -
    balance.existentialDeposit -
    10n ** BigInt(decimals) -
    currentUnbonding;

  const unbond = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const api = await firstValueFrom(stakingApi$);

      // Accounting for BigInt <-> Number error
      // assuming we're not letting the user unbond with an in-between value.
      const safeBond =
        bigBond < minBond ? (bigBond < minBond / 2n ? 0n : minBond) : bigBond;

      const unbonding = poolStatus.bond - safeBond;
      if (unbonding < 0) throw new Error("Can't unbond negative");
      const unbonding_points =
        (unbonding * (poolStatus.pool?.points ?? 0n)) / poolStatus.bond;

      api.tx.NominationPools.unbond({
        member_account: MultiAddress.Id(selectedAccount.address),
        unbonding_points,
      })
        .signSubmitAndWatch(selectedAccount.polkadotSigner)
        .subscribe(
          (v) => console.log(v),
          (err) => console.error(err)
        );
    } catch (ex) {
      console.error(ex);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Slider
          value={[bond]}
          min={0}
          max={Number(
            balance.total - balance.existentialDeposit - currentUnbonding
          )}
          onValueChange={([bond]) => setBond(bond)}
          onValueCommit={() => setCommitedBond(bond)}
        />
        <Input
          type="number"
          className="w-32"
          value={bond / 10 ** decimals}
          onChange={(v) => {
            const bond = v.target.valueAsNumber * 10 ** decimals;
            setBond(bond);
            setCommitedBond(bond);
          }}
        />
      </div>
      <div>
        <h3 className="text-muted-foreground font-medium">Result</h3>
        <div>
          <span className="font-bold">Bonded:</span>{" "}
          <TokenValue value={poolStatus.bond} />
        </div>
        {poolStatus.unlocks.map(({ era, value }, i) => (
          <div key={i}>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue className="tabular-nums" value={value} />{" "}
            <span className="text-muted-foreground">
              (Will unlock in {era - currentEra} days)
            </span>
          </div>
        ))}
        {bond < poolStatus.bond ? (
          <div>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue
              className="tabular-nums"
              value={poolStatus.bond - bigBond}
            />{" "}
            <span className="text-muted-foreground">
              (Will unlock in 28 days)
            </span>
          </div>
        ) : (
          <div>
            <span className="font-bold">Bonding:</span>{" "}
            <TokenValue
              className="tabular-nums"
              value={bigBond - poolStatus.bond}
            />{" "}
            {poolStatus.pendingRewards ? (
              <>
                + <TokenValue value={poolStatus.pendingRewards} />{" "}
                <span className="text-muted-foreground">
                  (from pending rewards)
                </span>
              </>
            ) : null}
          </div>
        )}
        <div>
          <span className="font-bold">Spendable:</span>{" "}
          <TokenValue
            className="tabular-nums"
            value={
              bond < poolStatus.bond
                ? balance.spendable
                : balance.spendable - (bigBond - poolStatus.bond)
            }
          />{" "}
        </div>
      </div>
      {committedBond > 0 && committedBond < Number(minBond) ? (
        <AlertCard type="error">
          Can't have a bond smaller than{" "}
          <TokenValue value={minBond} colored={false} />. Please increase the
          bond or remove all of it.
        </AlertCard>
      ) : null}
      {committedBond > maxBond ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
      <div>
        {bond < poolStatus.bond ? (
          <Button
            disabled={
              !selectedAccount || submitting || (bond > 0 && bond < minBond)
            }
            onClick={unbond}
          >
            Unbond
          </Button>
        ) : (
          <Button
            disabled={bigBond < minBond || poolStatus.bond - bigBond == 0n}
          >
            Bond
          </Button>
        )}
      </div>
    </div>
  );
};
