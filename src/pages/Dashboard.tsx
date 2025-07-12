import { AccountBalance } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { significantDigitsDecimals, TokenValue } from "@/components/TokenValue";
import { activeEra$, activeEraNumber$ } from "@/state/era";
import {
  currentNominatorBond$,
  lastReward$,
  rewardHistory$,
} from "@/state/nominate";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, Suspense } from "react";

const EraChart = lazy(() => import("@/components/EraChart"));

export const Dashboard = () => {
  const bond = useStateObservable(currentNominatorBond$);

  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <Card title="Balance">
            <AccountBalance />
          </Card>
          <ActiveEra />
          <NominateStatus />
          {bond && <NominateRewards />}
        </div>
      </Subscribe>
    </div>
  );
};

const ActiveEra = () => {
  const activeEra = useStateObservable(activeEra$);
  return (
    <Card title="Active Era">
      <div>{activeEra.era}</div>
      <div>{(activeEra.pctComplete * 100).toLocaleString()}%</div>
      <div>Expected end: {activeEra.estimatedEnd.toLocaleString()}</div>
    </Card>
  );
};

const NominateStatus = () => {
  const bond = useStateObservable(currentNominatorBond$);

  if (!bond) return <Card title="Not nominating" />;

  return (
    <Card title="Currently Nominating">
      Bond:{" "}
      <TokenValue
        value={bond.active}
        decimalsFn={significantDigitsDecimals(2)}
      />{" "}
      active /{" "}
      <TokenValue
        value={bond.total}
        decimalsFn={significantDigitsDecimals(2)}
      />{" "}
      total
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
        <div>History</div>
        <Suspense>
          <EraChart data={rewardHistory} activeEra={activeEra} />
        </Suspense>
      </div>
    </Card>
  );
};
