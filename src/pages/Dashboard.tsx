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
import { estimatedFuture } from "@/util/date";
import { formatPercentage } from "@/util/format";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy, Suspense } from "react";

const EraChart = lazy(() => import("@/components/EraChart"));

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback="Loading…">
        <div className="space-y-4">
          <ActiveEra />
          <Card title="Balance">
            <AccountBalance />
          </Card>
          <NominatingContent />
        </div>
      </Subscribe>
    </div>
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

const ActiveEra = () => {
  const activeEra = useStateObservable(activeEra$);
  return (
    <Card title="Active Era">
      <div>{activeEra.era}</div>
      <div>{formatPercentage(activeEra.pctComplete)}</div>
      <div>Expected end: {estimatedFuture(activeEra.estimatedEnd)}</div>
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
      <TokenValue value={bond.bond} decimalsFn={significantDigitsDecimals(2)} />{" "}
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
