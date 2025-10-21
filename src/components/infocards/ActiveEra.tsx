import { activeEra$ } from "@/state/era";
import { useStateObservable } from "@react-rxjs/core";
import { Card } from "../Card";
import { CircularProgress } from "../CircularProgress";

const formatEnd = (end: Date) => {
  const diff = end.getTime() - Date.now();
  const diffMinutes = Math.floor(diff / 60_000 + 0.5);

  if (diffMinutes < 1) {
    return "0:01";
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
};

export const ActiveEra = () => {
  const activeEra = useStateObservable(activeEra$);
  return (
    <Card title="Next Payout">
      <div className="flex flex-col items-center">
        <div className="text-xs text-chart-2">
          <CircularProgress
            progress={activeEra.pctComplete}
            text={formatEnd(activeEra.estimatedEnd)}
          />
        </div>
        <div className="text-sm">Era {activeEra.era}</div>
      </div>
    </Card>
  );
};
