import { AccountBalance } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { TransactionButton } from "@/components/Transactions";
import { stakingApi$ } from "@/state/chain";
import { isNominating$ } from "@/state/nominate";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ManageBond } from "./ManageBond";
import { ManageLocks } from "./ManageUnlocks";
import { PoolDetail } from "./PoolDetail";
import { CardPlaceholder } from "@/components/CardPlaceholder";

const PoolList = lazy(() => import("./PoolList"));

export const Pools = () => {
  return (
    <div>
      <NavMenu />
      <Subscribe fallback={<PoolsSkeleton />}>
        <Routes>
          <Route path=":poolId" Component={PoolDetail} />
          <Route
            path="*"
            element={
              <div className="space-y-4">
                <CurrentStatus />
                <PoolList />
              </div>
            }
          />
        </Routes>
      </Subscribe>
    </div>
  );
};

const PoolsSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={180} />
    <CardPlaceholder height={600} />
  </div>
);

const CurrentStatus = () => {
  const currentPool = useStateObservable(currentNominationPoolStatus$);
  const isNominating = useStateObservable(isNominating$);

  if (!currentPool?.pool) {
    return (
      <Card title="Status">
        <p>Not currently in a nomination pool</p>
        {isNominating ? (
          <p>
            Can't join a pool because you are already{" "}
            <Link className="underline" to="../../nominate">
              nominating
            </Link>
          </p>
        ) : (
          <p>Join a pool by selecting one below</p>
        )}
      </Card>
    );
  }

  return (
    <Card title="Status">
      <div>
        Currently member of{" "}
        <span className="text-accent-foreground">#{currentPool.pool.id}</span>{" "}
        <span className="font-medium">{currentPool.pool.name}</span>
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        <AccountBalance
          className="grow-2"
          extraValues={[
            {
              label: "Rewards",
              color:
                "color-mix(in srgb, var(--color-positive), transparent 40%)",
              tooltip:
                "Rewards generated during the previous eras ready to be withdrawn or compounded.",
              value: currentPool.pendingRewards,
            },
          ]}
        />
        {currentPool.unlocks.length ? <ManageLocks /> : null}
      </div>
      <div className="space-x-2 mt-4">
        <DialogButton
          title="Manage bond"
          content={({ close }) => <ManageBond close={close} />}
        >
          Manage bond
        </DialogButton>
        {currentPool.pendingRewards > 0 ? <ClaimRewards /> : null}
      </div>
    </Card>
  );
};

export const ClaimRewards = () => {
  const stakingApi = useStateObservable(stakingApi$);

  return (
    <>
      <TransactionButton
        createTx={() => stakingApi.tx.NominationPools.claim_payout()}
      >
        Claim rewards
      </TransactionButton>
      <TransactionButton
        createTx={() =>
          stakingApi.tx.NominationPools.bond_extra({
            extra: NominationPoolsBondExtra.Rewards(),
          })
        }
      >
        Compound rewards
      </TransactionButton>
    </>
  );
};
