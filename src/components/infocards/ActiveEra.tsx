import { activeEra$, eraDurationInMs$ } from "@/state/era"
import { useStateObservable, withDefault } from "@react-rxjs/core"
import { CircularProgress } from "../CircularProgress"
import { InfoCard, InfoPlaceholder } from "./InfoCard"
import { map } from "rxjs"

const formatEnd = (end: Date) => {
  const diff = end.getTime() - Date.now()
  const diffMinutes = Math.floor(diff / 60_000 + 0.5)

  if (diffMinutes < 0) {
    return "0:00"
  }
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return `${hours}:${minutes.toString().padStart(2, "0")}`
}

const eraHours$ = eraDurationInMs$.pipeState(
  map((v) => Math.round(v / (1000 * 60 * 60))),
  withDefault(null),
)

export const ActiveEra = () => {
  const duration = useStateObservable(eraHours$)

  return (
    <InfoCard
      title="Next Payout"
      fallback={<InfoPlaceholder className="stroke-accent-foreground" />}
      tooltip={`Rewards are distributed at the end of each era, which lasts about ${duration ?? "…"} hours`}
    >
      <EraContent />
    </InfoCard>
  )
}

const EraContent = () => {
  const activeEra = useStateObservable(activeEra$)

  return (
    <div className="flex flex-col items-center">
      <CircularProgress
        className="text-xs stroke-accent-foreground"
        progress={activeEra.pctComplete}
        text={formatEnd(activeEra.estimatedEnd)}
      />
      <div className="text-sm text-accent-foreground">Era {activeEra.era}</div>
    </div>
  )
}

export const activeEraSub$ = activeEra$
