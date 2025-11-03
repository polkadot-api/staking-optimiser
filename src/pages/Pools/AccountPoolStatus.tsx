import { DialogButton } from "@/components/DialogButton"
import { TransactionButton } from "@/components/Transactions"
import { stakingApi$ } from "@/state/chain"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { estimatedFuture } from "@/util/date"
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { Link } from "react-router-dom"
import { merge } from "rxjs"
import { ManageBond } from "./ManageBond"
import { ManageLocks, UnlockPoolBonds } from "./ManageUnlocks"

export const AccountPoolStatus = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const activeEra = useStateObservable(activeEra$)
  const eraDuration = useStateObservable(eraDurationInMs$)

  // This should not happen
  if (!poolStatus?.pool) return null

  const poolLink = (
    <Link to={"../pools/" + poolStatus.pool.id}>
      <span className="text-accent-foreground">#{poolStatus.pool.id}</span>{" "}
      <span className="font-medium">{poolStatus.pool.name}</span>
    </Link>
  )

  const isLeaving = poolStatus.bond === 0n
  if (isLeaving) {
    const lastUnlock = poolStatus.unlocks.reduce(
      (
        acc: {
          value: bigint
          era: number
        } | null,
        v,
      ) => (acc == null ? v : acc.era > v.era ? acc : v),
      null,
    )
    const unlocked = lastUnlock && lastUnlock.era <= activeEra.era
    const estimatedUnlock =
      lastUnlock &&
      new Date(
        Date.now() +
          Math.max(0, activeEra.estimatedEnd.getTime() - Date.now()) +
          (lastUnlock.era - activeEra.era - 1) * eraDuration,
      )

    return (
      <div className="grow">
        <div>Currently leaving pool {poolLink}</div>
        {unlocked ? (
          <div className="mt-2">
            <UnlockPoolBonds />
          </div>
        ) : estimatedUnlock ? (
          <div>Unlock: {estimatedFuture(estimatedUnlock)}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grow">
      <div>Member of pool {poolLink}</div>
      {poolStatus.unlocks.length ? <ManageLocks /> : null}
      <div className="space-x-2 mt-2">
        <DialogButton
          title="Manage bond"
          content={({ close }) => <ManageBond close={close} />}
        >
          Manage bond
        </DialogButton>
        {poolStatus.pendingRewards > 0n ? <ClaimRewards /> : null}
      </div>
    </div>
  )
}

const ClaimRewards = () => {
  const stakingApi = useStateObservable(stakingApi$)

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
  )
}

export const accountPoolStatusSub$ = merge(
  currentNominationPoolStatus$.pipe(liftSuspense()),
  activeEra$,
  eraDurationInMs$,
)
