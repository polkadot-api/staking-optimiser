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
import { activeEraNumber$ } from "@/state/era";
import {
  currentNominatorBond$,
  lastReward$,
  rewardHistory$,
} from "@/state/nominate";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, Suspense } from "react";

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
          <NominatingContent />
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

const NominatingContent = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return null;

  return (
    <>
      <NominateStatus />
      <NominateRewards />
    </>
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
