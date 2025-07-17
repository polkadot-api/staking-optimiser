import { AddressIdentity } from "@/components/AddressIdentity";
import { TokenValue } from "@/components/TokenValue";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useStateObservable } from "@react-rxjs/core";
import { type FC } from "react";
import { validatorPrefs$, type HistoricValidator } from "./validatorList.state";
import { Pin } from "lucide-react";

const formatPercentage = (value: number) =>
  (value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

export const ValidatorRow: FC<{
  validator: HistoricValidator & {
    position?: number;
  };
  index: number;
  selected: boolean;
  onSelectChange: (value: boolean) => void;
}> = ({ validator, index, selected, onSelectChange }) => {
  return (
    <>
      <td className="text-muted-foreground">
        #{(validator.position ?? index) + 1}
      </td>
      <td>
        <AddressIdentity addr={validator.address} />
      </td>
      <td className="text-right">{formatPercentage(validator.nominatorApy)}</td>
      <td className="text-right">{formatPercentage(validator.totalApy)}</td>
      <td className="text-right">{formatPercentage(validator.commission)}</td>
      <td className="text-right">
        <TokenValue value={validator.reward} />
      </td>
      <td className="text-right">
        {validator.nominatorQuantity.toLocaleString()}
      </td>
      <td className="text-right">{validator.points.toLocaleString()}</td>
      <td className="text-right hidden min-xl:table-cell">
        <TokenValue value={validator.activeBond} />
      </td>
      <td>
        <button
          className={cn({
            "text-neutral": selected,
            "text-muted-foreground": !selected,
          })}
          onClick={() => onSelectChange(!selected)}
        >
          <Pin />
        </button>
      </td>
    </>
  );
};

export const ValidatorCard: FC<{
  validator: HistoricValidator;
  selected: boolean;
  onSelectChange: (value: boolean) => void;
}> = ({ validator, selected, onSelectChange }) => {
  const prefs = useStateObservable(validatorPrefs$);

  const vPrefs = prefs[validator.address];

  return (
    <div
      className={cn("shadow p-2 rounded", {
        "bg-destructive/5":
          !vPrefs || vPrefs.blocked || vPrefs.commission === 1,
        "bg-neutral/5": selected,
      })}
    >
      <div className="flex items-center justify-between">
        <AddressIdentity addr={validator.address} />
        <button
          className={cn({
            "text-neutral": selected,
            "text-muted-foreground": !selected,
          })}
          onClick={() => onSelectChange(!selected)}
        >
          <Pin />
        </button>
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
