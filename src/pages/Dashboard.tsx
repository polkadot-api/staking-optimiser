import { AccountBalance, accountBalance$ } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import {
  ActiveEra,
  ActiveNominators,
  ActiveValidators,
  Inflation,
  Staked,
  TotalValidators,
} from "@/components/infocards";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { significantDigitsDecimals, TokenValue } from "@/components/TokenValue";
import { accountStatus$ } from "@/state/account";
import { activeEraNumber$ } from "@/state/era";
import {
  currentNominatorBond$,
  lastReward$,
  rewardHistory$,
} from "@/state/nominate";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, Suspense } from "react";
import { map } from "rxjs";
import TopValidators from "./Validators/TopValidators";
import TopPools from "./Pools/TopPools";
import { Button } from "@/components/ui/button";
import { openSelectAccount } from "@/components/Header/SelectAccount";
import { minBond$ } from "./Nominate/MinBondingAmounts";
import { minPoolJoin$ } from "./Pools/JoinPool";
import { Link } from "react-router-dom";

const EraChart = lazy(() => import("@/components/EraChart"));

/*
- staking status
              <img
                src={chainLogoByChain[chain]}
                alt={chain}
                className="size-6 rounded"
              />{" "}
              {chainNameByChain[chain]}
- APR trend
- reward history
- payout countdown
- fiat equivalent
- actions: Stake more, unbond, etc.
 */

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <div className="flex justify-center flex-wrap gap-4">
            <ActiveEra />
            <ActiveValidators />
            <TotalValidators />
            <ActiveNominators />
            <Staked />
            <Inflation />
          </div>
          <BalanceContent />
          <NominationContent />
        </div>
      </Subscribe>
    </div>
  );
};

const BalanceContent = () => {
  const balance = useStateObservable(accountBalance$);

  if (!balance?.total) return null;

  return (
    <Card title="Balance">
      <AccountBalance />
    </Card>
  );
};

const bondStatus$ = accountStatus$.pipeState(
  map((v) => {
    if (!v) return null;

    if (v.nomination.totalLocked) {
      return "nominating" as const;
    }

    if (v.nominationPool.pool) {
      return "pool" as const;
    }

    return null;
  })
);

const NominationContent = () => {
  const status = useStateObservable(bondStatus$);

  switch (status) {
    case "nominating":
      return (
        <>
          <NominateStatus />
          <NominateRewards />
        </>
      );
    case "pool":
      return <div>In a pool</div>;
    case null:
      return (
        <>
          <UnactiveActions />
          <Card title="Top Validators">
            <TopValidators />
          </Card>
          <Card title="Top Pools">
            <TopPools />
          </Card>
        </>
      );
  }
};

const UnactiveActions = () => {
  const balance = useStateObservable(accountBalance$);
  const minNomination = useStateObservable(minBond$);
  const minPoolNomination = useStateObservable(minPoolJoin$);

  if (!balance) {
    return (
      <Card title="Actions">
        <Button onClick={openSelectAccount}>Connect</Button>
      </Card>
    );
  }

  const buttons = [];
  if (balance.raw.free - balance.raw.existentialDeposit > minNomination) {
    buttons.push(
      <Button asChild key="nominate">
        <Link to="../nominate">Nominate</Link>
      </Button>
    );
  }

  if (balance.raw.free - balance.raw.existentialDeposit > minPoolNomination) {
    buttons.push(
      <Button asChild key="pools">
        <Link to="../pools">Join Pool</Link>
      </Button>
    );
  }

  if (!buttons.length) return null;
  return (
    <Card title="Actions">
      <div className="space-x-2">{buttons}</div>
    </Card>
  );
};

const NominateStatus = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return <Card title="Not nominating" />;

  return (
    <Card title="Currently Nominating">
      Bond:{" "}
      <TokenValue value={bond.bond} decimalsFn={significantDigitsDecimals(2)} />
    </Card>
  );
};

const NominateRewards = () => {
  const lastReward = useStateObservable(lastReward$);
  const rewardHistory = useStateObservable(rewardHistory$);
  const activeEra = useStateObservable(activeEraNumber$);

  return (
    <Card title="Nominate Rewards">
      <div>
        Last reward: <TokenValue value={lastReward.total} /> (APY{" "}
        {lastReward.apy.toLocaleString()}%)
      </div>
      <div>
        Commission: <TokenValue value={lastReward.totalCommission} />
      </div>
      <div>
        <div>History</div>
        <Suspense>
          <EraChart data={rewardHistory} activeEra={activeEra} />
        </Suspense>
      </div>
    </Card>
  );
};
