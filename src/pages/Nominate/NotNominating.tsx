import { Card } from "@/components/Card"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { Link } from "react-router-dom"
import { ManageNomination, manageNominationSub$ } from "./ManageNomination"
import {
  bondableAmount$,
  minBond$,
  MinBondingAmounts,
  minBondingAmountsSub$,
} from "./MinBondingAmounts"
import { merge } from "rxjs"

export const NotNominatingContent = () => {
  const minBond = useStateObservable(minBond$)
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const bondableAmount = useStateObservable(bondableAmount$)

  const renderNotEnough = () => {
    return (
      <div>
        You don't have enough funds to start nominating. Try{" "}
        <Link className="underline" to="../pools">
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
        <Link className="underline" to="../pools">
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
      <Card title="Start nominating" className="space-y-4">
        {bondableAmount == null ? (
          "Select an account to start nominating"
        ) : poolStatus?.pool ? (
          renderInPools()
        ) : bondableAmount <= minBond ? (
          renderNotEnough()
        ) : (
          <ManageNomination />
        )}
      </Card>
    </div>
  )
}

export const notNominatingContentSub$ = merge(
  minBondingAmountsSub$,
  minBond$,
  currentNominationPoolStatus$.pipe(liftSuspense()),
  bondableAmount$,
  manageNominationSub$,
)
