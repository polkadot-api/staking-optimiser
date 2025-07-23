import { AccountBalance } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { Button } from "@/components/ui/button";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy } from "react";
import { ManageBond } from "./ManageBond";
import { ManageLocks } from "./ManageUnlocks";

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
      <div className="flex flex-wrap gap-2 items-start">
        <AccountBalance
          className="grow-[2]"
          extraValues={[
            {
              label: "Rewards",
              color:
                "color-mix(in srgb, var(--color-positive), transparent 40%)",
              tooltip:
                "Rewards generated during the previous eras ready to be withdrawn or compounded.",
              value: pool.pendingRewards,
            },
          ]}
        />
        {pool.unbonding_eras.length ? <ManageLocks /> : null}
      </div>
      <div className="space-x-4 mt-4">
        <DialogButton title="Manage bond" content={() => <ManageBond />}>
          Manage bond
        </DialogButton>
        <Button>Claim rewards</Button>
      </div>
    </Card>
  );
};
