import { Card } from "@/components/Card";
import { useStateObservable } from "@react-rxjs/core";
import {
  bondableAmount$,
  minBond$,
  MinBondingAmounts,
} from "./MinBondingAmounts";
import { Link } from "react-router-dom";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { lazy, Suspense } from "react";

const PickValidators = lazy(() => import("./PickValidators"));

export const NotNominatingContent = () => {
  const minBond = useStateObservable(minBond$);
  const pool = useStateObservable(currentNominationPoolStatus$);
  const bondableAmount = useStateObservable(bondableAmount$);

  const renderNotEnough = () => {
    return (
      <div>
        You don't have enough funds to start nominating. Try{" "}
        <Link className="underline" to="../pools">
          nomination pools
        </Link>{" "}
        instead.
      </div>
    );
  };

  const renderInPools = () => {
    return (
      <div>
        You are already nominating through a{" "}
        <Link className="underline" to="../pools">
          nomination pool
        </Link>
        . You can't nominate individually and through a nomination pool
        simultaneously.
      </div>
    );
  };

  const renderSelect = () => (
    <Suspense fallback="Loading…">
      <PickValidators />
    </Suspense>
  );

  return (
    <div>
      <MinBondingAmounts />
      <Card title="Start nominating">
        {bondableAmount == null
          ? "Select an account to start nominating"
          : pool
            ? renderInPools()
            : bondableAmount <= minBond
              ? renderNotEnough()
              : renderSelect()}
      </Card>
    </div>
  );
};
