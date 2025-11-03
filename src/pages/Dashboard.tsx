import {
  AccountBalance,
  accountBalance$,
  accountBalanceSub$,
} from "@/components/AccountBalance"
import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { DialogButton } from "@/components/DialogButton"
import {
  ActiveEra,
  activeEraSub$,
  ActiveNominators,
  ActiveValidators,
  Inflation,
  Staked,
  TotalValidators,
} from "@/components/infocards"
import { NavMenu } from "@/components/NavMenu/NavMenu"
import { TokenValue } from "@/components/TokenValue"
import { Button } from "@/components/ui/button"
import { accountStatus$ } from "@/state/account"
import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { currentNominationPoolStatus$ } from "@/state/nominationPool"
import { estimatedFuture } from "@/util/date"
import { liftSuspense, useStateObservable } from "@react-rxjs/core"
import { openSelectAccount } from "polkahub"
import { Suspense } from "react"
import { Link } from "react-router-dom"
import { defer, map, merge, switchMap } from "rxjs"
import { minBond$ } from "./Nominate/MinBondingAmounts"
import {
  ManageNominationBtn,
  NominateRewards,
  nominateRewardsSub$,
} from "./Nominate/Nominating"
import { ClaimRewards } from "./Pools"
import { minPoolJoin$ } from "./Pools/JoinPool"
import { ManageBond } from "./Pools/ManageBond"
import { UnlockPoolBonds } from "./Pools/ManageUnlocks"
import TopPools, { topPoolsSub$ } from "./Pools/TopPools"
import TopValidators from "./Validators/TopValidators"

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="space-y-4">
          <div className="flex justify-center flex-wrap gap-4">
            <ActiveEra />
            <ActiveValidators />
            <TotalValidators />
            <ActiveNominators />
            <Staked />
            <Inflation />
          </div>
          <BalanceContent />
          <NominationContent />
        </div>
      </Suspense>
    </div>
  )
}

export const dashboardSub$ = defer(() =>
  merge(activeEraSub$, accountBalanceSub$, nominationContentSub$),
)

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
  </div>
)

const BalanceContent = () => {
  const balance = useStateObservable(accountBalance$)

  if (!balance?.total) return null

  return (
    <Suspense fallback={<CardPlaceholder height={350} />}>
      <Card title="Balance">
        <AccountBalance />
      </Card>
    </Suspense>
  )
}

const bondStatus$ = accountStatus$.pipeState(
  map((v) => {
    if (!v) return null

    if (v.nomination.totalLocked) {
      return "nominating" as const
    }

    if (v.nominationPool.pool) {
      return "pool" as const
    }

    return null
  }),
)

const NominationContent = () => {
  const status = useStateObservable(bondStatus$)

  switch (status) {
    case "nominating":
      return (
        <>
          <Card title="Actions">
            <ManageNominationBtn />
          </Card>
          <NominateRewards />
        </>
      )
    case "pool":
      return <PoolStatus />
    case null:
      return (
        <>
          <UnactiveActions />
          <Card title="Top Validators">
            <TopValidators />
          </Card>
          <Card title="Top Pools">
            <TopPools />
          </Card>
        </>
      )
  }
}

const poolStatusSub$ = merge(
  currentNominationPoolStatus$.pipe(liftSuspense()),
  activeEra$,
  eraDurationInMs$,
)
const unactiveSub$ = merge(
  accountBalance$,
  minBond$,
  minPoolJoin$,
  topPoolsSub$,
)

const nominationContentSub$ = merge(
  bondStatus$.pipe(
    switchMap((status) =>
      status === "nominating"
        ? nominateRewardsSub$
        : status === "pool"
          ? poolStatusSub$
          : unactiveSub$,
    ),
  ),
)

const UnactiveActions = () => {
  const balance = useStateObservable(accountBalance$)
  const minNomination = useStateObservable(minBond$)
  const minPoolNomination = useStateObservable(minPoolJoin$)

  if (!balance) {
    return (
      <Card title="Actions">
        <Button onClick={openSelectAccount}>Connect</Button>
      </Card>
    )
  }

  const buttons = []
  if (balance.raw.free - balance.raw.existentialDeposit > minNomination) {
    buttons.push(
      <Button asChild key="nominate">
        <Link to="../nominate">Nominate</Link>
      </Button>,
    )
  }

  if (balance.raw.free - balance.raw.existentialDeposit > minPoolNomination) {
    buttons.push(
      <Button asChild key="pools">
        <Link to="../pools">Join Pool</Link>
      </Button>,
    )
  }

  if (!buttons.length) return null
  return (
    <Card title="Actions">
      <div className="space-x-2">{buttons}</div>
    </Card>
  )
}

const PoolStatus = () => {
  const poolStatus = useStateObservable(currentNominationPoolStatus$)
  const activeEra = useStateObservable(activeEra$)
  const eraDuration = useStateObservable(eraDurationInMs$)

  // This should not happen
  if (!poolStatus?.pool) return null

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
      <Card title="Pool">
        <div>
          Currently leaving pool{" "}
          <span className="text-accent-foreground">#{poolStatus.pool.id}</span>{" "}
          <span className="font-medium">{poolStatus.pool.name}</span>
        </div>
        {estimatedUnlock ? (
          <div>Unlock: {estimatedFuture(estimatedUnlock)}</div>
        ) : null}
        <div className="mt-2">{unlocked ? <UnlockPoolBonds /> : null}</div>
      </Card>
    )
  }

  return (
    <Card title="Pool">
      <div>
        Currently member of{" "}
        <span className="text-accent-foreground">#{poolStatus.pool.id}</span>{" "}
        <span className="font-medium">{poolStatus.pool.name}</span>
      </div>
      {poolStatus.pendingRewards > 0n ? (
        <div>
          Pending rewards: <TokenValue value={poolStatus.pendingRewards} />
        </div>
      ) : null}
      <div className="space-x-2 mt-2">
        <DialogButton
          title="Manage bond"
          content={({ close }) => <ManageBond close={close} />}
        >
          Manage bond
        </DialogButton>
        {poolStatus.pendingRewards > 0n ? <ClaimRewards /> : null}
      </div>
    </Card>
  )
}
