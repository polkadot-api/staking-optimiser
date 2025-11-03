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
import { Suspense } from "react"
import { Link } from "react-router-dom"
import { EMPTY, merge, switchMap, tap } from "rxjs"
import { minBond$ } from "./Nominate/MinBondingAmounts"
import {
  AccountPoolStatus,
  accountPoolStatusSub$,
} from "./Pools/AccountPoolStatus"
import { minPoolJoin$ } from "./Pools/JoinPool"
import { NominateStatus, nominateStatusSub$ } from "./Nominate/NominateStatus"

export const AccountStatus = () => (
  <Suspense fallback={<CardPlaceholder height={276} />}>
    <AccountStatusContent />
  </Suspense>
)

const AccountStatusContent = () => {
  const account = useStateObservable(accountStatus$)

  if (!account) return null

  const isNominating = account.nomination.totalLocked > 0n
  const isInAPool = account.nominationPool.pool != null

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
        {isNominating ? (
          <NominateStatus />
        ) : isInAPool ? (
          <AccountPoolStatus />
        ) : (
          <NotNominatingContent />
        )}
      </div>
    </Card>
  )
}

export const accountStatusSub$ = merge(
  accountStatus$.pipe(
    switchMap((v) => {
      if (!v) return EMPTY
      if (v.nomination.totalLocked > 0n) return nominateStatusSub$
      if (v.nominationPool.pool != null) return accountPoolStatusSub$
      return notNominatingSub$
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

  return (
    <div className="grow space-y-1">
      <div className="text-muted-foreground">Currently not nominating.</div>
      {canJoinPool && canNominate ? (
        <div>
          You have enough funds to either{" "}
          <Link className="underline" to="../nominate">
            start nominating
          </Link>{" "}
          or{" "}
          <Link className="underline" to="../pools">
            join a pool
          </Link>
          .
        </div>
      ) : canNominate ? (
        <div>
          You have enough funds to become a nominator.{" "}
          <Link className="underline" to="../nominate">
            Start nominating
          </Link>{" "}
          to earn staking rewards.
        </div>
      ) : canJoinPool ? (
        <div>
          You have enough funds to join a pool.{" "}
          <Link className="underline" to="../pools">
            Join now
          </Link>{" "}
          to start earning rewards.
        </div>
      ) : (
        <div>You don't have enough funds to start staking.</div>
      )}
    </div>
  )
}

const notNominatingSub$ = merge(accountBalance$, minBond$, minPoolJoin$)
