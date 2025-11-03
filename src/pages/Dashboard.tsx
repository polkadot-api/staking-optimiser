import { Card } from "@/components/Card"
import { CardPlaceholder } from "@/components/CardPlaceholder"
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
import { Suspense } from "react"
import { defer, merge } from "rxjs"
import { AccountStatus, accountStatusSub$ } from "./AccountStatus"
import TopPools, { topPoolsSub$ } from "./Pools/TopPools"
import TopValidators, { topValidatorsSub$ } from "./Validators/TopValidators"

export const Dashboard = () => {
  return (
    <div>
      <NavMenu />
      <div className="space-y-4">
        <div className="flex justify-center flex-wrap gap-4">
          <ActiveEra />
          <ActiveValidators />
          <TotalValidators />
          <ActiveNominators />
          <Staked />
          <Inflation />
        </div>
        <AccountStatus />
        <div className="flex gap-4 flex-col lg:flex-row">
          <Suspense
            fallback={
              <CardPlaceholder
                className="basis-4 grow shrink-0"
                height={1240}
              />
            }
          >
            <Card
              title="Top Validators of the last era"
              className="basis-4 grow shrink-0"
            >
              <TopValidators />
            </Card>
          </Suspense>
          <Suspense
            fallback={
              <CardPlaceholder
                className="basis-4 grow shrink-0"
                height={1240}
              />
            }
          >
            <Card
              title="Top Pools of the last era"
              className="basis-4 grow shrink-0"
            >
              <TopPools />
            </Card>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export const dashboardSub$ = defer(() =>
  merge(activeEraSub$, accountStatusSub$, topValidatorsSub$, topStatsSub$),
)

const topStatsSub$ = merge(topPoolsSub$)
