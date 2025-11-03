import { AddressIdentity } from "@/components/AddressIdentity"
import { Card } from "@/components/Card"
import { TokenValue } from "@/components/TokenValue"
import { HISTORY_DEPTH, PERBILL } from "@/constants"
import { cn } from "@/lib/utils"
import { stakingApi$, stakingSdk$ } from "@/state/chain"
import { activeEraNumber$, eraDurationInMs$, getEraApy } from "@/state/era"
import { validatorPerformance$ } from "@/state/validators"
import { formatPercentage } from "@/util/format"
import { CardPlaceholder } from "@polkahub/ui-components"
import { state, useStateObservable } from "@react-rxjs/core"
import {
  ArrowLeft,
  Crown,
  DollarSign,
  Gauge,
  LineChart,
  PieChart,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { SS58String } from "polkadot-api"
import { lazy, Suspense, type FC } from "react"
import { Link, useParams } from "react-router-dom"
import { combineLatest, debounceTime, map, merge, switchMap } from "rxjs"
import { Stat } from "../Pools/PoolDetail"

const EraChart = lazy(() => import("@/components/EraChart"))

export const ValidatorDetailPage: FC = () => {
  const { address } = useParams<{ address: string }>()
  if (!address) {
    return null
  }
  return <ValidatorDetail address={address} />
}

const validator$ = state((address: SS58String) =>
  combineLatest([stakingApi$, stakingSdk$, activeEraNumber$]).pipe(
    switchMap(([api, sdk, era]) =>
      combineLatest({
        validatorPrefs: api.query.Staking.Validators.getValue(address).then(
          (r) => ({
            ...r,
            commission: Number(r.commission) / PERBILL,
          }),
        ),
        lastRewards: sdk.getValidatorRewards(address, era - 1),
      }),
    ),
  ),
)

const apyInfo$ = state(
  (address: SS58String) =>
    validatorPerformance$(address).pipe(
      map((performance) => {
        if (performance.length === 0) return null

        const average =
          performance.reduce((acc, v) => acc + (v.apy ?? 0), 0) /
          performance.length
        const max = performance.reduce((acc, v) => Math.max(acc, v.apy ?? 0), 0)
        const min = performance.reduce(
          (acc, v) => Math.min(acc, v.apy ?? 0),
          Number.POSITIVE_INFINITY,
        )
        return { average, max, min }
      }),
    ),
  null,
)

const ValidatorDetail: FC<{ address: string }> = ({ address }) => {
  const { validatorPrefs, lastRewards } = useStateObservable(
    validator$(address),
  )
  const apyInfo = useStateObservable(apyInfo$(address))
  const eraDuration = useStateObservable(eraDurationInMs$)
  const activeEra = useStateObservable(activeEraNumber$)

  const lastValidatorApy = lastRewards
    ? getEraApy(
        lastRewards.nominatorsShare,
        lastRewards.activeBond,
        eraDuration,
      )
    : null

  const validatorStakePct = lastRewards
    ? Number(lastRewards.selfStake) / Number(lastRewards.activeBond)
    : null
  const totalReward = lastRewards
    ? Number(lastRewards.nominatorsShare + lastRewards.commissionShare)
    : null
  const nominatorRewardPct = lastRewards
    ? (Number(lastRewards.nominatorsShare) * (1 - validatorStakePct!)) /
      totalReward!
    : null
  const validatorRewardPct = lastRewards
    ? (Number(lastRewards.nominatorsShare) * validatorStakePct!) / totalReward!
    : null
  const commissionRewardPct = lastRewards
    ? Number(lastRewards.commissionShare) / totalReward!
    : null

  return (
    <div className="space-y-4 p-2">
      <Link to=".." className="flex items-center gap-2">
        <ArrowLeft className="size-4" /> Back to validators
      </Link>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <AddressIdentity
              addr={address}
              className="flex-1 text-lg md:text-xl"
            />
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[0.7rem]",
                validatorPrefs.blocked
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {validatorPrefs.blocked ? "Blocking nominations" : "Open"}
            </span>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Users className="size-4" />} label="Nominators">
              {lastRewards?.nominatorCount.toLocaleString() ?? "-"}
            </Stat>
            <Stat icon={<ShieldCheck className="size-4" />} label="Active bond">
              {lastRewards ? (
                <TokenValue value={lastRewards.activeBond} />
              ) : (
                "-"
              )}
            </Stat>
            <Stat icon={<Crown className="size-4" />} label="Self stake">
              {lastRewards ? <TokenValue value={lastRewards.selfStake} /> : "-"}
            </Stat>
            <Stat icon={<PieChart className="size-4" />} label="Commission">
              {formatPercentage(validatorPrefs.commission)}
            </Stat>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Card
          title={`Reward breakdown (era ${activeEra - 1})`}
          className="space-y-4 grow basis-1/2 min-w-1/2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <LineChart className="size-4" />
              <span>Points awarded</span>
            </div>
            <span>{lastRewards?.points.toLocaleString() ?? "-"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4" />
              <span>Total payout</span>
            </div>
            {lastRewards ? <TokenValue value={lastRewards.reward} /> : "-"}
          </div>

          {lastRewards ? (
            <div className="space-y-2">
              <div>Reward share</div>
              <div className="h-2 rounded-full overflow-hidden flex bg-red-500">
                <div
                  className="shrink bg-blue-500"
                  style={{
                    flexBasis: `${nominatorRewardPct! * 100}%`,
                  }}
                />
                <div
                  className="shrink bg-orange-400"
                  style={{
                    flexBasis: `${validatorRewardPct! * 100}%`,
                  }}
                />
                <div
                  className="shrink bg-red-600"
                  style={{
                    flexBasis: `${commissionRewardPct! * 100}%`,
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <div className="inline-block ml-0.5 bg-blue-500 w-2 h-2 rounded-full align-middle" />{" "}
                Nominators |{" "}
                <div className="inline-block ml-0.5 bg-orange-400 w-2 h-2 rounded-full align-middle" />{" "}
                Validator |{" "}
                <div className="inline-block ml-0.5 bg-red-600 w-2 h-2 rounded-full align-middle" />{" "}
                Commission
              </div>
            </div>
          ) : null}
        </Card>

        <Card
          title={
            <>
              <Gauge className="inline-block align-text-bottom" size={20} />{" "}
              Reward insights
            </>
          }
          className="space-y-4 basis-1/4 grow min-w-sm"
        >
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Last era APY</dt>
              <dd className="text-right font-medium text-foreground">
                {lastValidatorApy ? formatPercentage(lastValidatorApy) : "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Average nominator APY</dt>
              <dd className="text-right font-medium text-foreground">
                {apyInfo ? formatPercentage(apyInfo.average / 100) : "…"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                APY range (last {HISTORY_DEPTH} eras)
              </dt>
              <dd className="text-right font-medium text-foreground">
                {apyInfo
                  ? `${formatPercentage(
                      apyInfo.min / 100,
                    )} - ${formatPercentage(apyInfo.max / 100)}`
                  : "…"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Suspense fallback={<CardPlaceholder />}>
        <Card title="Performance history" className="space-y-4">
          <PerformanceChart addr={address} />
        </Card>
      </Suspense>
    </div>
  )
}

const performanceChart$ = state((addr: SS58String) =>
  validatorPerformance$(addr).pipe(
    debounceTime(200),
    map((values) => values.filter((v) => v != null)),
  ),
)

const PerformanceChart: FC<{ addr: SS58String }> = ({ addr }) => {
  const activeEra = useStateObservable(activeEraNumber$)
  const performance = useStateObservable(performanceChart$(addr))

  return <EraChart data={performance} activeEra={activeEra} />
}

export const validatorDetailPageSub$ = (address: SS58String) =>
  merge(
    validator$(address),
    performanceChart$(address),
    eraDurationInMs$,
    activeEraNumber$,
  )
