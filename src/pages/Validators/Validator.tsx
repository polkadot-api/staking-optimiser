import { AddressIdentity } from "@/components/AddressIdentity";
import { TokenValue } from "@/components/TokenValue";
import { cn } from "@/lib/utils";
import { useStateObservable } from "@react-rxjs/core";
import { Pin } from "lucide-react";
import { type FC } from "react";
import {
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "./validatorList.state";

const formatPercentage = (value: number) =>
  (value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

export const ValidatorRow: FC<{
  validator: PositionValidator;
  onSelectChange: (value: boolean) => void;
}> = ({ validator, onSelectChange }) => {
  return (
    <>
      <td className="text-muted-foreground">{validator.position + 1}</td>
      <td>
        <AddressIdentity addr={validator.address} />
      </td>
      <td
        className={cn("text-right font-bold", {
          "text-positive": validator.nominatorApy > 0,
        })}
      >
        {formatPercentage(validator.nominatorApy)}
      </td>
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
            "text-neutral": validator.selected,
            "text-muted-foreground": !validator.selected,
          })}
          onClick={() => onSelectChange(!validator.selected)}
        >
          <Pin />
        </button>
      </td>
    </>
  );
};

export const ValidatorCard: FC<{
  validator: HistoricValidator;
}> = ({ validator }) => {
  const prefs = useStateObservable(validatorPrefs$);

  const vPrefs = prefs[validator.address];

  return (
    <div
      className={cn("shadow p-2 rounded space-y-4", {
        "bg-destructive/5": !vPrefs || vPrefs.blocked,
      })}
    >
      <div className="flex items-center justify-between">
        <AddressIdentity addr={validator.address} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">
            Nominator APY
          </span>
          :{" "}
          <span
            className={cn("font-bold", {
              "text-positive": validator.nominatorApy > 0,
            })}
          >
            {formatPercentage(validator.nominatorApy)}
          </span>
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
    </div>
  );
};
