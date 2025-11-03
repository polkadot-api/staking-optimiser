import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { NavMenu } from "@/components/NavMenu/NavMenu"
import { location$ } from "@/router"
import { isNominating$ } from "@/state/nominate"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { lazy, Suspense } from "react"
import { matchPath, Route, Routes } from "react-router-dom"
import { defer, map, merge, switchMap } from "rxjs"
import { AccountStatus, accountStatusSub$ } from "../AccountStatus"
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

  if (isNominating) return null

  if (!currentPool?.pool) {
    return (
      <Card title="Status">
        <p>Not currently in a nomination pool</p>
        <p>Join a pool by selecting one below</p>
      </Card>
    )
  }

  return <AccountStatus />
}
const currentStatusSub$ = merge(
  currentNominationPoolStatus$.pipe(liftSuspense()),
  isNominating$,
  accountStatusSub$,
)
