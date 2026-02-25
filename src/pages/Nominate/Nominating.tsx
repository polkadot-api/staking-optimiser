import { AddressIdentity } from "@/components/AddressIdentity"
import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
import { PERBILL } from "@/constants"
import { cn } from "@/lib/utils"
import { selectedAccountAddr$ } from "@/state/account"
import { stakingApi$ } from "@/state/chain"
import { activeEraNumber$ } from "@/state/era"
import {
  currentNominatorStatus$,
  rewardHistory$,
  validatorActive$,
} from "@/state/nominate"
import { validatorPerformance$ } from "@/state/validators"
import { roundToDecimalPlaces } from "@/util/format"
import { state, useStateObservable } from "@react-rxjs/core"
import { type SS58String } from "polkadot-api"
import { lazy, Suspense, type FC } from "react"
import { Link, useParams } from "react-router"
import {
  combineLatest,
  debounceTime,
  defer,
  distinctUntilChanged,
  ignoreElements,
  map,
  merge,
  switchMap,
} from "rxjs"
import { AccountStatus, accountStatusSub$ } from "../AccountStatus"
import { MinBondingAmounts, minBondingAmountsSub$ } from "./MinBondingAmounts"

const EraChart = lazy(() => import("@/components/EraChart"))

export const NominatingContent = () => (
  <div className="space-y-4">
    <MinBondingAmounts />
    <AccountStatus />
    <NominateRewards />
    <SelectedValidators />
  </div>
)

export const nominatingContentSub$ = defer(() =>
  merge(
    minBondingAmountsSub$,
    accountStatusSub$,
    nominateRewardsSub$,
    selectedValidatorsSub$,
  ),
)

const selectedValidators$ = state(
  combineLatest([selectedAccountAddr$, stakingApi$]).pipe(
    switchMap(([addr, stakingApi]) =>
      addr
        ? stakingApi.query.Staking.Nominators.watchValue(addr).pipe(
            map(update => update.value),
            distinctUntilChanged()
          )
        : [null],
    ),
    map((v) => v?.targets ?? []),
  ),
)

const validatorPrefs$ = state((addr: SS58String) =>
  combineLatest([activeEraNumber$, stakingApi$]).pipe(
    switchMap(([era, stakingApi]) =>
      stakingApi.query.Staking.ErasValidatorPrefs.getValue(era, addr),
    ),
  ),
)

const SelectedValidators = () => {
  const validators = useStateObservable(selectedValidators$)

  return (
    <Card title="Selected Validators">
      {validators.length ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2">
          {validators.map((v) => (
            <li key={v}>
              <Suspense fallback={<SelectedValidatorSkeleton validator={v} />}>
                <SelectedValidator validator={v} />
              </Suspense>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground">No selected validators</div>
      )}
    </Card>
  )
}

const validatorRewardHistory$ = state((addr: SS58String) =>
  combineLatest([validatorActive$(addr), validatorPerformance$(addr)]).pipe(
    debounceTime(200),
    map(([activeChart, performanceChart]) =>
      activeChart.map((active, i) => ({
        ...active,
        apy: performanceChart[i]?.apy ?? null,
      })),
    ),
    map((v) => v.filter(() => true)),
  ),
)

const selectedValidatorsSub$ = selectedValidators$.pipe(
  switchMap((v) =>
    merge(
      ...v.map((addr) =>
        merge(validatorRewardHistory$(addr), validatorPrefs$(addr)),
      ),
      activeEraNumber$,
    ),
  ),
  ignoreElements(),
)

const validatorIsCurrentlyActive$ = state(
  (addr: SS58String) =>
    currentNominatorStatus$.pipe(
      map((status) => !!status.find((v) => v.validator === addr)),
    ),
  false,
)

const SelectedValidator: FC<{
  validator: SS58String
}> = ({ validator }) => {
  const { chain } = useParams()
  const rewardHistory = useStateObservable(validatorRewardHistory$(validator))
  const isActive = useStateObservable(validatorIsCurrentlyActive$(validator))
  const prefs = useStateObservable(validatorPrefs$(validator))
  const activeEra = useStateObservable(activeEraNumber$)

  const averageApy = rewardHistory.length
    ? roundToDecimalPlaces(
        rewardHistory
          .map((v) => v.apy)
          .filter((v) => v != null)
          .reduce((a, b) => a + b, 0) / rewardHistory.length,
        2,
      )
    : null

  return (
    <div
      className={cn("bg-secondary rounded p-2", {
        "bg-positive/10 shadow-lg": isActive,
      })}
    >
      <div className="flex items-center justify-between">
        <Link to={`/${chain}/validators/${validator}`}>
          <AddressIdentity addr={validator} />
        </Link>
        {averageApy || prefs.commission ? (
          <div className="text-muted-foreground text-sm">
            {averageApy ? (
              <div>
                Avg APY: <b className="text-foreground">{averageApy}%</b>
              </div>
            ) : null}
            {prefs.commission ? (
              <div>
                Commission:{" "}
                <b className="text-foreground">
                  {roundToDecimalPlaces(
                    100 * Number(prefs.commission / PERBILL),
                    2,
                  )}
                  %
                </b>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <EraChart height={200} data={rewardHistory} activeEra={activeEra} />
    </div>
  )
}
const SelectedValidatorSkeleton: FC<{ validator: SS58String }> = ({
  validator,
}) => (
  <div
    className="bg-secondary animate-pulse rounded p-2"
    style={{ height: 255 }}
  >
    <AddressIdentity addr={validator} />
  </div>
)

export const NominateRewards = () => {
  const rewardHistory = useStateObservable(rewardHistory$)
  const activeEra = useStateObservable(activeEraNumber$)

  return (
    <Suspense fallback={<CardPlaceholder />}>
      <Card title="Nominate Rewards">
        <EraChart data={rewardHistory} activeEra={activeEra} />
      </Card>
    </Suspense>
  )
}

export const nominateRewardsSub$ = activeEraNumber$
