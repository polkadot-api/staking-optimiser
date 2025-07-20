import { AccountBalance, accountBalance$ } from "@/components/AccountBalance";
import { AlertCard } from "@/components/AlertCard";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { TokenValue } from "@/components/TokenValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { selectedSignerAccount$ } from "@/state/account";
import { stakingApi$, tokenDecimals$ } from "@/state/chain";
import { activeEra$, activeEraNumber$ } from "@/state/era";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { MultiAddress } from "@polkadot-api/descriptors";
import { state, Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, useState } from "react";
import { firstValueFrom, switchMap } from "rxjs";

const PoolList = lazy(() => import("./PoolList"));

export const Pools = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <CurrentStatus />
          <PoolList />
        </div>
      </Subscribe>
    </div>
  );
};

const CurrentStatus = () => {
  const pool = useStateObservable(currentNominationPoolStatus$);

  if (!pool) {
    return <Card title="Status">Not currently in a nomination pool</Card>;
  }

  return (
    <Card title="Status">
      <div>
        Currently member of{" "}
        <span className="text-muted-foreground">#{pool.pool_id}</span>{" "}
        <span className="font-medium">{pool.name}</span>
      </div>
      <AccountBalance
        extraValues={[
          {
            label: "Rewards",
            color: "color-mix(in srgb, var(--color-positive), transparent 40%)",
            tooltip:
              "Rewards generated during the previous eras ready to be withdrawn or compounded.",
            value: pool.pendingRewards,
          },
        ]}
      />
      <div className="space-x-4 mt-4">
        <DialogButton title="Manage bond" content={() => <ManageBond />}>
          Manage bond
        </DialogButton>
        <Button>Claim rewards</Button>
      </div>
    </Card>
  );
};

const minBond$ = state(
  stakingApi$.pipe(
    switchMap((api) => api.query.NominationPools.MinJoinBond.getValue())
  )
);

const ManageBond = () => {
  const pool = useStateObservable(currentNominationPoolStatus$);
  const balance = useStateObservable(accountBalance$);
  const decimals = useStateObservable(tokenDecimals$);
  const minBond = useStateObservable(minBond$);
  const selectedAccount = useStateObservable(selectedSignerAccount$);
  const currentEra = useStateObservable(activeEraNumber$);
  const [bond, setBond] = useState(pool ? Number(pool.bond) : 0);
  const [committedBond, setCommitedBond] = useState(bond);

  const [submitting, setSubmitting] = useState(false);

  if (!balance) return null;
  if (!pool) return <div>TODO not in a pool</div>;

  const currentUnbonding = pool.unbonding_eras
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
      const big_bond =
        bond < minBond
          ? bond < minBond / 2n
            ? 0n
            : minBond
          : BigInt(Math.round(bond));

      const unbonding = pool.bond - big_bond;
      if (unbonding < 0) throw new Error("Can't unbond negative");
      const unbonding_points = (unbonding * pool.points) / pool.bond;
      console.log({
        bond,
        big_bond,
        unbonding,
        points: pool.points,
        ogBond: pool.bond,
        unbonding_points,
      });

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
          <TokenValue value={pool.bond} />
        </div>
        {pool.unbonding_eras.map(({ era, value }, i) => (
          <div key={i}>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue className="tabular-nums" value={value} />{" "}
            <span className="text-muted-foreground">
              (Will unlock in {era - currentEra} days)
            </span>
          </div>
        ))}
        {bond < pool.bond ? (
          <div>
            <span className="font-bold">Unbonding:</span>{" "}
            <TokenValue
              className="tabular-nums"
              value={pool.bond - BigInt(Math.round(bond))}
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
              value={BigInt(Math.round(bond)) - pool.bond}
            />{" "}
          </div>
        )}
        <div>
          <span className="font-bold">Spendable:</span>{" "}
          <TokenValue
            className="tabular-nums"
            value={
              bond < pool.bond
                ? balance.spendable
                : balance.spendable - (BigInt(Math.round(bond)) - pool.bond)
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
        {bond < pool.bond ? (
          <Button
            disabled={
              !selectedAccount || submitting || (bond > 0 && bond < minBond)
            }
            onClick={unbond}
          >
            Unbond
          </Button>
        ) : (
          <Button>Bond</Button>
        )}
      </div>
    </div>
  );
};
