import { PERQUINT } from "@/constants"
import { relayApi$ } from "@/state/chain"
import { formatPercentage } from "@/util/format"
import type { Dot } from "@polkadot-api/descriptors"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { CompatibilityLevel, type TypedApi } from "polkadot-api"
import { switchMap } from "rxjs"
import { CircularProgress } from "../CircularProgress"
import { InfoCard } from "./InfoCard"

type InflationApi = TypedApi<Dot>
const inflation$ = relayApi$.pipeState(
  switchMap(async (api) => {
    const inflationApi = api as InflationApi
    const staticApis = await inflationApi.getStaticApis()
    const isCompatible =
      await staticApis.compat.apis.Inflation.experimental_inflation_prediction_info.isCompatible(
        CompatibilityLevel.BackwardsCompatible,
      )
    if (isCompatible) {
      return inflationApi.apis.Inflation.experimental_inflation_prediction_info()
    }
    return null
  }),
  withDefault(null),
)

export const Inflation = () => {
  const inflation = useStateObservable(inflation$)

  const pct = inflation ? Number(inflation.inflation) / PERQUINT : null

  return (
    <InfoCard title="Inflation" className="hidden lg:flex">
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-chart-2">
        <CircularProgress
          progress={pct}
          text={pct ? formatPercentage(pct) : ""}
        />
      </div>
    </InfoCard>
  )
}
