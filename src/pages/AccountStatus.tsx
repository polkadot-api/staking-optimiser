import {
  AccountBalance,
  accountBalance$,
  accountBalanceSub$,
  type AccountBalanceValue,
} from "@/components/AccountBalance"
import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { accountStatus$ } from "@/state/account"
import { useStateObservable } from "@react-rxjs/core"
import { Suspense, type FC } from "react"
import { Link } from "react-router-dom"
import { EMPTY, merge, switchMap, tap } from "rxjs"
import { minBond$ } from "./Nominate/MinBondingAmounts"
import {
  AccountPoolStatus,
  accountPoolStatusSub$,
} from "./Pools/AccountPoolStatus"
import { minPoolJoin$ } from "./Pools/JoinPool"
import { NominateStatus, nominateStatusSub$ } from "./Nominate/NominateStatus"
import { EmptyState, NotEnoughFunds } from "@/components/EmptyState"
import { GitFork, Star } from "lucide-react"
import { Button } from "@polkahub/ui-components"

export const AccountStatus: FC<{ source?: "nom" | "pool" }> = ({ source }) => (
  <Suspense fallback={<CardPlaceholder height={276} />}>
    <AccountStatusContent source={source} />
  </Suspense>
)

const AccountStatusContent: FC<{ source?: "nom" | "pool" }> = ({ source }) => {
  const account = useStateObservable(accountStatus$)

  if (!account) return null

  const isNominating =
    account.nomination.totalLocked > 0n ||
    (account.nomination.nominating?.validators || []).length > 0
  const isInAPool = account.nominationPool.pool != null
  const inner =
    source === "pool" || !isNominating ? (
      isInAPool ? (
        <AccountPoolStatus />
      ) : (
        <NotNominatingContent />
      )
    ) : isNominating ? (
      <NominateStatus />
    ) : (
      <NotNominatingContent />
    )

  const extraValues: AccountBalanceValue[] = []
  if (account.nominationPool.pendingRewards) {
    extraValues.push({
      label: "Rewards",
      color: "color-mix(in srgb, var(--color-positive), transparent 40%)",
      tooltip:
        "Rewards generated during the previous eras ready to be withdrawn or compounded.",
      value: account.nominationPool.pendingRewards,
    })
  }

  return (
    <Card title="Status">
      <div className="flex gap-2 flex-wrap">
        <AccountBalance className="grow" extraValues={extraValues} />
        {inner}
      </div>
    </Card>
  )
}

export const accountStatusSub$ = merge(
  accountStatus$.pipe(
    switchMap((v) => {
      if (!v) return EMPTY
      const subs = []
      if (v.nomination.totalLocked > 0n) subs.push(nominateStatusSub$)
      if (v.nominationPool.pool != null) subs.push(accountPoolStatusSub$)
      return !subs.length ? notNominatingSub$ : merge(...subs)
    }),
    tap({ error: (err) => console.log("as", err) }),
  ),
  accountBalanceSub$.pipe(tap({ error: (err) => console.log("as", err) })),
)

const NotNominatingContent = () => {
  const balance = useStateObservable(accountBalance$)
  const minNomination = useStateObservable(minBond$)
  const minPoolNomination = useStateObservable(minPoolJoin$)

  if (!balance) return null

  const canNominate =
    balance.raw.free - balance.raw.existentialDeposit > minNomination
  const canJoinPool =
    balance.raw.free - balance.raw.existentialDeposit > minPoolNomination

  const inner = (!canNominate && !canJoinPool)
    ?<NotEnoughFunds minValue={minPoolNomination} to="join a pool" />
    : canNominate ? <EmptyState
      icon={<Star />}
      title="Enough funds to nominate"
      action={
        <Button asChild>
          <Link to="../nominate">Start Nominating</Link>
        </Button>
      }
    />
 : <EmptyState
      icon={<GitFork />}
      title="Enough funds to join a nomination pool"
      action={
        <Button asChild>
          <Link to="../pools">Join a Pool</Link>
        </Button>
      }
    />


  return <div className="grow space-y-1">{inner}</div>

}

const notNominatingSub$ = merge(accountBalance$, minBond$, minPoolJoin$)
