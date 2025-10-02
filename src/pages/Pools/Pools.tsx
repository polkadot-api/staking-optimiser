import { AccountBalance } from "@/components/AccountBalance";
import { Card } from "@/components/Card";
import { DialogButton } from "@/components/DialogButton";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { TransactionButton } from "@/components/Transactions";
import { selectedSignerAccount$ } from "@/state/account";
import { stakingApi$ } from "@/state/chain";
import { currentNominationPoolStatus$ } from "@/state/nominationPool";
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors";
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
  const currentPool = useStateObservable(currentNominationPoolStatus$);

  if (!currentPool?.pool) {
    return <Card title="Status">Not currently in a nomination pool</Card>;
  }

  return (
    <Card title="Status">
      <div>
        Currently member of{" "}
        <span className="text-muted-foreground">#{currentPool.pool.id}</span>{" "}
        <span className="font-medium">{currentPool.pool.name}</span>
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
              value: currentPool.pendingRewards,
            },
          ]}
        />
        {currentPool.unlocks.length ? <ManageLocks /> : null}
      </div>
      <div className="space-x-2 mt-4">
        <DialogButton title="Manage bond" content={() => <ManageBond />}>
          Manage bond
        </DialogButton>
        {currentPool.pendingRewards > 0 ? <Claim /> : null}
      </div>
    </Card>
  );
};

const Claim = () => {
  const signer =
    useStateObservable(selectedSignerAccount$)?.polkadotSigner ?? null;
  const stakingApi = useStateObservable(stakingApi$);

  return (
    <>
      <TransactionButton
        createTx={() => stakingApi.tx.NominationPools.claim_payout()}
        signer={signer}
      >
        Claim rewards
      </TransactionButton>
      <TransactionButton
        createTx={() =>
          stakingApi.tx.NominationPools.bond_extra({
            extra: NominationPoolsBondExtra.Rewards(),
          })
        }
        signer={signer}
      >
        Compound rewards
      </TransactionButton>
    </>
  );
};
