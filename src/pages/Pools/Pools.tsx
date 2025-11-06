import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { location$ } from "@/router"
import { isNominating$ } from "@/state/nominate"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { lazy, Suspense } from "react"
import { Link, matchPath, Route, Routes } from "react-router-dom"
import { defer, map, merge, switchMap } from "rxjs"
import { AccountStatus, accountStatusSub$ } from "../AccountStatus"
import { PoolDetail, poolDetailSub$ } from "./PoolDetail"
import {
  EmptyState,
  NoAccountSelected,
  NotEnoughFunds,
} from "@/components/EmptyState"
import { GitFork, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { accountStatus$ } from "@/state/account"
import { accountBalance$ } from "@/components/AccountBalance"
import { minPoolJoin$ } from "./JoinPool"

const PoolList = lazy(async () => {
  const module = await import("./PoolList")
  module.poolListSub$.subscribe()
  return module
})

export const Pools = () => {
  return (
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
  const balance = useStateObservable(accountBalance$)
  const minBond = useStateObservable(minPoolJoin$)

  if (!balance) return <NoAccountSelected />

  if (balance.spendable + balance.raw.frozen < minBond)
    return <NotEnoughFunds minValue={minBond} to="join a pool" />

  if (isNominating)
    return (
      <EmptyState
        icon={<Star />}
        title="Already nominating"
        description="You are nominating through direct nomination, so you can't join a pool."
        action={
          <Button asChild>
            <Link to="../../nominate">Nomination status</Link>
          </Button>
        }
      />
    )

  if (!currentPool?.pool)
    return (
      <EmptyState
        icon={<GitFork />}
        title="Join a nomination pool"
        description="Select a pool from the list below to start staking."
      />
    )

  return <AccountStatus />
}
const currentStatusSub$ = merge(
  currentNominationPoolStatus$.pipe(liftSuspense()),
  isNominating$,
  accountStatusSub$,
  accountBalance$,
  minPoolJoin$,
)
