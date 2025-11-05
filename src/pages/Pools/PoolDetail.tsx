import { AddressIdentity } from "@/components/AddressIdentity"
import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { Loading } from "@/components/Spinner"
import { TokenValue } from "@/components/TokenValue"
import { cn } from "@/lib/utils"
import { accountStatus$ } from "@/state/account"
import { stakingSdk$ } from "@/state/chain"
import { activeEraNumber$ } from "@/state/era"
import { nominatorRewardHistory$ } from "@/state/nominate"
import { formatPercentage } from "@/util/format"
import { state, useStateObservable, withDefault } from "@react-rxjs/core"
import {
  ArrowLeft,
  Gauge,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react"
import {
  Fragment,
  lazy,
  Suspense,
  useMemo,
  type FC,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react"
import { Link, useParams } from "react-router-dom"
import { combineLatest, map, merge, switchMap } from "rxjs"
import { aggregatedValidators$ } from "../Validators/validatorList.state"
import { JoinPool, joinPoolSub$ } from "./JoinPool"
import type { NominationPool } from "./poolList.state"
import { HintTooltip, TextHintTooltip } from "@/components/HintTooltip"

const pool$ = state((id: number) =>
  combineLatest([
    stakingSdk$.pipe(switchMap((sdk) => sdk.getNominationPool$(id))),
    aggregatedValidators$.pipe(
      map((validators) =>
        Object.fromEntries(validators?.map((v) => [v.address, v]) ?? []),
      ),
    ),
  ]).pipe(
    map(([pool, validators]) => {
      if (!pool) return null

      const nominations = pool.nominations
        .map((v) => validators[v])
        .filter((v) => v != null)
        .sort((a, b) => b.nominatorApy - a.nominatorApy)
      const apys = nominations.map((v) => v.nominatorApy)
      const commissionMul = 1 - pool.commission.current

      return {
        ...pool,
        nominations,
        minApy: apys.length
          ? apys.reduce((a, b) => Math.min(a, b)) * commissionMul
          : 0,
        maxApy: apys.reduce((a, b) => Math.max(a, b), 0) * commissionMul,
        avgApy: apys.length
          ? (apys.reduce((a, b) => a + b) / apys.length) * commissionMul
          : 0,
      }
    }),
  ),
)

const isNominating$ = accountStatus$.pipeState(
  map((v) => !!v?.nomination.nominating || !!v?.nominationPool.pool),
  withDefault(true),
)

const statusConfig: Record<"Open" | "Blocked" | "Destroying", string> = {
  Open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Blocked:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Destroying: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
}

export const PoolDetail = () => {
  const { poolId } = useParams<{ poolId: string }>()
  const pool = useStateObservable(pool$(Number(poolId)))
  const isNominating = useStateObservable(isNominating$)

  if (!pool) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loading>Loading pool details…</Loading>
      </div>
    )
  }

  const statusBadge = statusConfig[pool.state]

  return (
    <div className="space-y-6 p-2">
      <Link to=".." className="flex items-center gap-2">
        <ArrowLeft className="size-4" /> Back to pools
      </Link>

      <header className="rounded-2xl border border-border/60 bg-background/90 p-6 shadow-sm">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground space-x-2">
            <span>Nomination pool</span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                statusBadge,
              )}
            >
              {pool.state}
            </span>
          </div>
          <h1 className="text-2xl font-semibold capitalize">
            {pool.name || `Pool #${pool.id}`}
          </h1>
          <div className="text-sm">
            <span className="font-medium text-foreground">Pool </span>
            <span className="text-accent-foreground">#{pool.id}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat
            icon={<Users className="size-4" />}
            label="Members"
            hint="Number of accounts currently in this pool"
          >
            {pool.memberCount.toLocaleString()}
          </Stat>
          <Stat
            icon={<ShieldCheck className="size-4" />}
            label="Pool bond"
            hint="Total amount of DOT staked by all pool members"
          >
            <TokenValue value={pool.bond} />
          </Stat>
          <Stat
            icon={<Gauge className="size-4" />}
            label="Average APY"
            hint="Average validator performance for the last era, based on this pool's nominations"
          >
            {formatPercentage(pool.avgApy)}
          </Stat>
          <Stat
            icon={<PieChart className="size-4" />}
            label="Commission"
            hint="Portion of rewards taken by the pool operator"
          >
            {formatPercentage(pool.commission.current)}
          </Stat>
          <Stat
            icon={<ShieldAlert className="size-4" />}
            label="Nominations"
            className="hidden lg:block"
            hint="Number of validators this pool is currently backing"
          >
            {pool.nominations.length.toLocaleString()}
          </Stat>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card
            title="Commission details"
            className="space-y-4"
            hint={
              <HintTooltip className="space-y-1">
                <p>Commission parameters configured for this pool</p>
                <p>
                  The operator can adjust the commission according to the limits
                  defined by these parameters.
                </p>
                <p>
                  <strong>Current commission</strong>: The active commission
                  percentage applied to rewards.
                </p>
                <p>
                  <strong>Maximum commission</strong>: The highest commission
                  that can ever be set. This value can only be decreased.
                </p>
                <p>
                  <strong>Change rate</strong>: Defines how quickly the
                  commission can change between eras. It can only be made more
                  restrictive.
                </p>
                <p>
                  <strong>Throttle era</strong>: The most recent era when the
                  commission was modified under a rate limit.
                </p>
                <p>
                  <strong>Claim Permission</strong>: Specifies who is authorized
                  to claim the commission rewards.
                </p>
              </HintTooltip>
            }
          >
            <DefinitionList
              items={[
                {
                  term: "Current commission",
                  value: formatPercentage(pool.commission.current),
                },
                pool.commission.max !== undefined
                  ? {
                      term: "Maximum commission",
                      value: formatPercentage(pool.commission.max),
                    }
                  : null,
                pool.commission.change_rate
                  ? {
                      term: "Change rate",
                      value: `${formatPercentage(
                        pool.commission.change_rate.max_increase,
                      )} max / ${pool.commission.change_rate.min_delay} eras`,
                    }
                  : null,
                pool.commission.throttleFrom !== undefined
                  ? {
                      term: "Throttle era",
                      value: pool.commission.throttleFrom.toLocaleString(),
                    }
                  : null,
                pool.commission.claimPermission
                  ? ((permission) => ({
                      term: "Claim Permission",
                      value:
                        permission.type === "Permissionless" ? (
                          "Permissionless"
                        ) : (
                          <AddressIdentity addr={permission.value} />
                        ),
                    }))(pool.commission.claimPermission)
                  : null,
              ].filter((v) => v != null)}
            />
          </Card>

          {!isNominating && pool.state === "Open" ? (
            <JoinPool poolId={Number(poolId)} className="lg:hidden" />
          ) : null}

          <PoolRewards pool={pool} />

          <Card title="Nominated validators" className="space-y-3">
            {pool.nominations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This pool has not nominated any validators yet.
              </p>
            ) : (
              <div className="space-y-3 pr-1">
                {pool.nominations.map((validator, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/80 px-3 py-2"
                  >
                    <Link to={`../../validators/${validator.address}`}>
                      <AddressIdentity addr={validator.address} />
                    </Link>
                    <div>
                      <span className="text-foreground/60">APY:</span>{" "}
                      {formatPercentage(validator.nominatorApy)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          {!isNominating && pool.state === "Open" ? (
            <JoinPool poolId={Number(poolId)} className="hidden lg:block" />
          ) : null}
          <Card title="Pool addresses" className="space-y-4">
            <DefinitionList
              items={[
                {
                  term: "Pool",
                  value: <AddressIdentity addr={pool.addresses.pool} />,
                  hint: "The bonded account holding all members' staked DOT. Acts as the nominator on behalf of the entire pool.",
                },
                {
                  term: "Depositor",
                  value: <AddressIdentity addr={pool.addresses.depositor} />,
                  hint: "The account that created the pool and made the initial bond. Can only withdraw after all other members have left.",
                },
                pool.addresses.root
                  ? {
                      term: "Root",
                      value: <AddressIdentity addr={pool.addresses.root} />,
                      hint: "The pool's admin account. Can change other roles and perform their actions.",
                    }
                  : null,
                pool.addresses.nominator
                  ? {
                      term: "Nominator",
                      value: (
                        <AddressIdentity addr={pool.addresses.nominator} />
                      ),
                      hint: "The account that selects which validators the pool nominates for staking rewards.",
                    }
                  : null,
                pool.addresses.bouncer
                  ? {
                      term: "Bouncer",
                      value: <AddressIdentity addr={pool.addresses.bouncer} />,
                      hint: "The account that manages pool access and state. Can block or un-block the pool and remove members when necessary.",
                    }
                  : null,
                pool.addresses.commission
                  ? {
                      term: "Commission account",
                      value: (
                        <AddressIdentity addr={pool.addresses.commission} />
                      ),
                      hint: "The account that earns the commission from the pool.",
                    }
                  : null,
              ].filter((v) => v != null)}
            />
          </Card>
        </aside>
      </div>
    </div>
  )
}

export const poolDetailSub$ = (id: number) =>
  merge(pool$(id), joinPoolSub$, activeEraNumber$)

export const Stat: FC<
  PropsWithChildren<{
    icon: ReactElement
    label: string
    className?: string
    hint?: string
  }>
> = ({ icon, label, children, className, hint }) => (
  <div
    className={cn(
      "rounded-xl border border-border/60 bg-muted/30 p-4",
      className,
    )}
  >
    <div className="flex justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      {hint ? <TextHintTooltip hint={hint} /> : null}
    </div>
    <div className="mt-2 text-xl font-semibold text-foreground">{children}</div>
  </div>
)

const DefinitionList = ({
  items,
}: {
  items: Array<{
    term: string
    value: ReactNode
    hint?: string
  }>
}) => (
  <dl className="grid gap-3 text-sm">
    {items.map((item, idx) => (
      <Fragment key={`${item.term}-${idx}`}>
        <dt className="text-muted-foreground flex items-center gap-1">
          <span>{item.term}</span>
          {item.hint ? <TextHintTooltip hint={item.hint} /> : null}
        </dt>
        <dd className="rounded-lg border border-border/60 bg-muted/30 p-3 font-medium text-foreground">
          {item.value}
        </dd>
      </Fragment>
    ))}
  </dl>
)

const EraChart = lazy(() => import("@/components/EraChart"))
const PoolRewards: FC<{
  pool: Pick<NominationPool, "addresses" | "commission">
}> = ({ pool }) => {
  const rewardHistory = useStateObservable(
    nominatorRewardHistory$(pool.addresses.pool),
  )
  const activeEra = useStateObservable(activeEraNumber$)

  const apyHistory = useMemo(
    () =>
      rewardHistory.map(({ era, apy }) => ({
        era,
        apy: apy * (1 - pool.commission.current),
      })),
    [rewardHistory],
  )

  return (
    <Suspense fallback={<CardPlaceholder />}>
      <Card title="APY History">
        <EraChart data={apyHistory} activeEra={activeEra} />
      </Card>
    </Suspense>
  )
}
