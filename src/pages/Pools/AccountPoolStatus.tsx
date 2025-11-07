import { DialogButton } from "@/components/DialogButton"
import { TransactionButton } from "@/components/Transactions"
import { stakingApi$ } from "@/state/chain"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import type { FC } from "react"
import { Link, useParams } from "react-router-dom"
import { merge } from "rxjs"
import { ManageBond } from "./ManageBond"
import { ManageLocks, manageLocksSub$ } from "./ManageUnlocks"
import { lastEraRewards$ } from "./poolList.state"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { LastEraReward } from "@/components/LastEraReward"
import { cn } from "@/lib/utils"

export const AccountPoolStatus = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const { chain } = useParams<{ chain: string }>()

  // This should not happen
  if (!poolStatus?.pool) return null

  const isActive = poolStatus.bond > 0n
  const badgeClassName = isActive
    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800"
    : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800"

  return (
    <div className="flex flex-col gap-3 grow ">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-2 w-2 rounded-full animate-pulse",
            isActive ? "bg-purple-500" : "bg-gray-400",
          )}
        />
        <Badge
          variant="outline"
          className={cn("text-base font-semibold px-3 py-1 ", badgeClassName)}
        >
          {isActive ? "Pool member" : "Leaving Pool"}
        </Badge>
      </div>
      <div className="space-y-2 p-4 rounded-lg bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/50">
        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400">
          <Users className="h-4 w-4" />
          <span className="font-medium">Nomination Pool</span>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
            <Link to={`/${chain}/pools/${poolStatus.pool.id}`}>
              <span className="text-purple-600 dark:text-purple-400">
                {poolStatus.pool.id}
              </span>{" "}
              {poolStatus.pool.name}
            </Link>
          </p>
        </div>
      </div>
      {isActive && (
        <LastEraRewards poolId={poolStatus.pool.id} bond={poolStatus.bond} />
      )}
      {poolStatus.unlocks.length ? <ManageLocks /> : null}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {isActive && (
          <DialogButton
            title="Manage bond"
            className="flex-1"
            content={({ close }) => <ManageBond close={close} />}
          >
            Manage bond
          </DialogButton>
        )}
        {isActive && poolStatus.pendingRewards > 0n ? <ClaimRewards /> : null}
      </div>
    </div>
  )
}

const LastEraRewards: FC<{ poolId: number; bond: bigint }> = ({
  poolId,
  bond,
}) => {
  const lastEraRewards = useStateObservable(lastEraRewards$(poolId))
  if (!lastEraRewards || !lastEraRewards.activeBond) return null

  const selfReward =
    (lastEraRewards.poolMembers * bond) / lastEraRewards.activeBond

  return <LastEraReward apy={lastEraRewards.apy} total={selfReward} />
}

const ClaimRewards = () => {
  const stakingApi = useStateObservable(stakingApi$)

  return (
    <>
      <TransactionButton
        className="flex-1"
        createTx={() => stakingApi.tx.NominationPools.claim_payout()}
      >
        Claim rewards
      </TransactionButton>
      <TransactionButton
        className="flex-1"
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
  manageLocksSub$,
  currentNominationPoolStatus$.pipe(liftSuspense()),
  activeEra$,
  eraDurationInMs$,
)
