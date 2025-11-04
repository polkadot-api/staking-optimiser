import { DialogButton } from "@/components/DialogButton"
import { TokenValue } from "@/components/TokenValue"
import { TransactionButton } from "@/components/Transactions"
import { stakingApi$ } from "@/state/chain"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { estimatedFuture } from "@/util/date"
import { formatPercentage } from "@/util/format"
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import type { FC } from "react"
import { Link, useParams } from "react-router-dom"
import { merge } from "rxjs"
import { ManageBond } from "./ManageBond"
import { ManageLocks, UnlockPoolBonds } from "./ManageUnlocks"
import { lastEraRewards$ } from "./poolList.state"

export const AccountPoolStatus = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const activeEra = useStateObservable(activeEra$)
  const eraDuration = useStateObservable(eraDurationInMs$)
  const { chain } = useParams<{ chain: string }>()

  // This should not happen
  if (!poolStatus?.pool) return null

  const poolLink = (
    <Link to={`/${chain}/pools/${poolStatus.pool.id}`}>
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
    <div className="grow flex flex-col">
      <div className="mb-1">Member of pool {poolLink}</div>
      <LastEraRewards poolId={poolStatus.pool.id} bond={poolStatus.bond} />
      {poolStatus.unlocks.length ? <ManageLocks /> : null}
      <div className="grow" />
      <div className="space-x-2">
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

const LastEraRewards: FC<{ poolId: number; bond: bigint }> = ({
  poolId,
  bond,
}) => {
  const lastEraRewards = useStateObservable(lastEraRewards$(poolId))

  if (!lastEraRewards) {
    return <div>Last era reward with current bond: …</div>
  }
  if (!lastEraRewards.activeBond) {
    return <div>Last era reward with current bond: N/A</div>
  }

  const selfReward =
    (lastEraRewards.poolMembers * bond) / lastEraRewards.activeBond

  return (
    <div>
      Last era reward with current bond: <TokenValue value={selfReward} />{" "}
      <span className="text-muted-foreground">
        ({formatPercentage(lastEraRewards.apy)} APY)
      </span>
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
