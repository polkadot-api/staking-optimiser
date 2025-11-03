import { activeEra$ } from "@/state/era"
import { useStateObservable } from "@react-rxjs/core"
import { CircularProgress } from "../CircularProgress"
import { InfoCard, InfoPlaceholder } from "./InfoCard"

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

export const ActiveEra = () => (
  <InfoCard
    title="Next Payout"
    fallback={<InfoPlaceholder className="stroke-accent-foreground" />}
  >
    <EraContent />
  </InfoCard>
)

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
