import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { Link } from "react-router-dom"
import {
  bondableAmount$,
  minBond$,
  MinBondingAmounts,
  minBondingAmountsSub$,
} from "../MinBondingAmounts"
import { merge } from "rxjs"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { lazy, Suspense } from "react"

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

  const renderNotEnough = () => {
    return (
      <div>
        You don't have enough funds to start nominating. Try{" "}
        <Link className="underline" to="../../pools">
          nomination pools
        </Link>{" "}
        instead.
      </div>
    )
  }

  const renderInPools = () => {
    return (
      <div>
        You are already nominating through a{" "}
        <Link className="underline" to="../../pools">
          nomination pool
        </Link>
        . You can't nominate individually and through a nomination pool
        simultaneously.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MinBondingAmounts />
      {bondableAmount == null ? (
        "Select an account to start nominating"
      ) : poolStatus?.pool ? (
        renderInPools()
      ) : bondableAmount <= minBond ? (
        renderNotEnough()
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
)
