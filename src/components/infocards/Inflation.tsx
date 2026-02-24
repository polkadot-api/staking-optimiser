import { PERQUINT } from "@/constants"
import { formatPercentage } from "@/util/format"
import { state, useStateObservable } from "@react-rxjs/core"
import { CircularProgress } from "../CircularProgress"
import { InfoCard } from "./InfoCard"
import { of } from "rxjs"

// TODO Inflation.experimental_inflation_prediction_info removed after migration, find another source
const inflation$ = state<{ inflation: bigint } | null>(of(null), null)

export const Inflation = () => {
  const inflation = useStateObservable(inflation$)

  const pct = inflation ? Number(inflation.inflation) / PERQUINT : null

  if (pct == null) return null

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
