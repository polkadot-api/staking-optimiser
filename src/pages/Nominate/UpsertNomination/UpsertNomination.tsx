import { CardPlaceholder } from "@/components/CardPlaceholder"
import {
  EmptyState,
  NoAccountSelected,
  NotEnoughFunds,
} from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { GitFork } from "lucide-react"
import { lazy, Suspense } from "react"
import { Link } from "react-router"
import { merge } from "rxjs"
import {
  bondableAmount$,
  minBond$,
  MinBondingAmounts,
  minBondingAmountsSub$,
} from "../MinBondingAmounts"
import { accountStatus$ } from "@/state/account"

const manageNominationModule = import("./ManageNomination")
const ManageNomination = lazy(async () => {
  const module = await manageNominationModule
  module.manageNomination$.subscribe()
  return module
})

export const UpsertNomination = () => {
  const minBond = useStateObservable(minBond$)
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const bondableAmount = useStateObservable(bondableAmount$)
  const accountStatus = useStateObservable(accountStatus$)

  const isActive =
    accountStatus &&
    accountStatus.nomination.currentBond > 0 &&
    (accountStatus.nomination.nominating?.validators || []).length > 0

  return (
    <div className="space-y-4">
      <MinBondingAmounts />
      {bondableAmount == null ? (
        <NoAccountSelected to="nominate validators" />
      ) : poolStatus?.pool && !isActive ? (
        <EmptyState
          icon={<GitFork />}
          title="Already in a pool"
          description="You're already nominating through a pool. You can't nominate individually at the same time."
          action={
            <Button asChild>
              <Link to="../../pools">Pool status</Link>
            </Button>
          }
        />
      ) : bondableAmount <= minBond ? (
        <NotEnoughFunds
          minValue={minBond}
          to="start nominating"
          action={
            bondableAmount > 0 ? (
              <Button asChild>
                <Link to="../../pools">Try nomination pools</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <Suspense fallback={<ManageNominationSkeleton />}>
          <ManageNomination />
        </Suspense>
      )}
    </div>
  )
}

const ManageNominationSkeleton = () => {
  return (
    <div className="space-y-2">
      <CardPlaceholder height={165} />
      <CardPlaceholder height={430} />
      <CardPlaceholder height={150} />
      <CardPlaceholder />
    </div>
  )
}

export const upsertNomination$ = merge(
  minBondingAmountsSub$,
  minBond$,
  currentNominationPoolStatus$.pipe(liftSuspense()),
  bondableAmount$,
  accountStatus$,
)
