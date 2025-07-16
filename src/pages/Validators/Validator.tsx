import { AddressIdentity } from "@/components/AddressIdentity";
import { TokenValue } from "@/components/TokenValue";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useStateObservable } from "@react-rxjs/core";
import { type FC } from "react";
import { validatorPrefs$, type HistoricValidator } from "./validatorList.state";

const formatPercentage = (value: number) =>
  (value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

export const Validator: FC<{
  validator: HistoricValidator;
  selected: boolean;
  onSelectChange: (value: boolean) => void;
}> = ({ validator, selected, onSelectChange }) => {
  const prefs = useStateObservable(validatorPrefs$);

  const vPrefs = prefs[validator.address];

  return (
    <div
      className={cn("shadow p-2 rounded w-xs", {
        "bg-destructive/5":
          !vPrefs || vPrefs.blocked || vPrefs.commission === 1,
        "bg-neutral/5": selected,
      })}
    >
      <div className="flex items-center justify-between">
        <AddressIdentity addr={validator.address} />
        <Checkbox checked={selected} onCheckedChange={onSelectChange} />
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Nominator APY</span>
        : {formatPercentage(validator.nominatorApy)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">
          Validator APY:
        </span>{" "}
        {formatPercentage(validator.totalApy)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Commission:</span>{" "}
        {formatPercentage(validator.commission)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Reward</span>:{" "}
        <TokenValue value={validator.reward} />
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Points</span>:{" "}
        {validator.points.toLocaleString()}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Bond</span>
        : <TokenValue value={validator.activeBond} />
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Nominators</span>:{" "}
        {validator.nominatorQuantity.toLocaleString()}
      </div>
    </div>
  );
};
