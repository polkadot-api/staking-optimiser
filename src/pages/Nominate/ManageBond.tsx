import { accountBalance$ } from "@/components/AccountBalance";
import { AlertCard } from "@/components/AlertCard";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, tokenDecimals$ } from "@/state/chain";
import { activeEraNumber$ } from "@/state/era";
import { currentNominatorBond$ } from "@/state/nominate";
import { useStateObservable } from "@react-rxjs/core";
import { useState } from "react";
import { firstValueFrom } from "rxjs";
import { minBond$ } from "../Nominate/MinBondingAmounts";

export const ManageBond = () => {
  const currentBond = useStateObservable(currentNominatorBond$);
  const balance = useStateObservable(accountBalance$);
  const decimals = useStateObservable(tokenDecimals$);
  const minBond = useStateObservable(minBond$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);
  const currentEra = useStateObservable(activeEraNumber$);
  const [bond, setBond] = useState(
    currentBond ? Number(currentBond.active) : 0
  );
  const [committedBond, setCommitedBond] = useState(bond);

  const [submitting, setSubmitting] = useState(false);

  if (!balance) return null;
  if (!currentBond) return <div>TODO not currently bonding</div>;

  const bigBond = isNaN(bond) ? 0n : BigInt(Math.round(bond));

  const maxBond = balance.spendable + currentBond.active;

  const unbond = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const api = await firstValueFrom(stakingApi$);

      // Accounting for BigInt <-> Number error
      // assuming we're not letting the user unbond with an in-between value.
      const safeBond =
        bigBond < minBond ? (bigBond < minBond / 2n ? 0n : minBond) : bigBond;

      const unbonding = currentBond.active - safeBond;
      if (unbonding < 0) throw new Error("Can't unbond negative");

      api.tx.Staking.unbond({
        value: unbonding,
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

  const addBond = async () => {
    if (!selectedAccount) return;

    setSubmitting(true);
    try {
      const api = await firstValueFrom(stakingApi$);

      const bonding = bigBond - currentBond.active;
      if (bonding < 0) throw new Error("Can't bond negative");

      // TODO api.tx.Staking.bond()
      api.tx.Staking.bond_extra({
        max_additional: bonding,
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
          max={Number(maxBond)}
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
          <TokenValue value={currentBond.active} />
        </div>
        {currentBond.unlocks.map(({ era, value }, i) => (
          <div key={i}>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue className="tabular-nums" value={value} />{" "}
            <span className="text-muted-foreground">
              (Will unlock in {era - currentEra} days)
            </span>
          </div>
        ))}
        {bond < currentBond.active ? (
          <div>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue
              className="tabular-nums"
              value={currentBond.active - bigBond}
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
              value={bigBond - currentBond.active}
            />{" "}
          </div>
        )}
        <div>
          <span className="font-bold">Spendable:</span>{" "}
          <TokenValue
            className="tabular-nums"
            value={
              bond < currentBond.active
                ? balance.spendable
                : balance.spendable - (bigBond - currentBond.active)
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
      {committedBond > maxBond - 10n ** BigInt(decimals) ? (
        <AlertCard type="warning">
          Careful! If you bond all your balance you might not have enough to pay
          transaction fees, which could lock you out.
        </AlertCard>
      ) : null}
      <div>
        {bond < currentBond.active ? (
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
            disabled={bigBond < minBond || currentBond.active - bigBond == 0n}
            onClick={addBond}
          >
            Bond
          </Button>
        )}
      </div>
    </div>
  );
};
