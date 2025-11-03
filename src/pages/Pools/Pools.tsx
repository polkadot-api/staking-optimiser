import { AccountBalance, accountBalanceSub$ } from "@/components/AccountBalance"
import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { DialogButton } from "@/components/DialogButton"
import { NavMenu } from "@/components/NavMenu/NavMenu"
import { TransactionButton } from "@/components/Transactions"
import { location$ } from "@/router"
import { stakingApi$ } from "@/state/chain"
import { isNominating$ } from "@/state/nominate"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { NominationPoolsBondExtra } from "@polkadot-api/descriptors"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { lazy, Suspense } from "react"
import { Link, matchPath, Route, Routes } from "react-router-dom"
import { defer, map, merge, switchMap } from "rxjs"
import { ManageBond } from "./ManageBond"
import { ManageLocks, manageLocksSub$ } from "./ManageUnlocks"
import { PoolDetail, poolDetailSub$ } from "./PoolDetail"

const PoolList = lazy(async () => {
  const module = await import("./PoolList")
  module.poolListSub$.subscribe()
  return module
})

export const Pools = () => {
  return (
    <div>
      <NavMenu />
      <Suspense fallback={<PoolsSkeleton />}>
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
      </Suspense>
    </div>
  )
}

const routedDetail$ = location$.pipe(
  map(
    (location) =>
      matchPath("/:chainId/pools/:poolId", location.pathname)?.params.poolId,
  ),
  switchMap((id) => (id ? poolDetailSub$(Number(id)) : [])),
)
export const poolsSub$ = defer(() => merge(currentStatusSub$, routedDetail$))

const PoolsSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={180} />
    <CardPlaceholder height={600} />
  </div>
)

const CurrentStatus = () => {
  const currentPool = useStateObservable(currentNominationPoolStatus$)
  const isNominating = useStateObservable(isNominating$)

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
    )
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
  )
}
const currentStatusSub$ = merge(
  currentNominationPoolStatus$.pipe(liftSuspense()),
  isNominating$,
  accountBalanceSub$,
  manageLocksSub$,
)

export const ClaimRewards = () => {
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
