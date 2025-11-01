import { AddressIdentity } from "@/components/AddressIdentity";
import { TokenValue } from "@/components/TokenValue";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import { type FC, type ReactElement } from "react";
import {
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "./validatorList.state";
import { Link, useParams } from "react-router-dom";

export const ValidatorRow: FC<{
  validator: PositionValidator;
  onSelectChange: (value: boolean) => void;
  selectIcon: (selected: boolean) => ReactElement;
}> = ({ validator, onSelectChange, selectIcon }) => {
  const { chain } = useParams();
  return (
    <>
      <td className="text-muted-foreground">{validator.position + 1}</td>
      <td className="overflow-hidden">
        <Link to={`/${chain}/validators/${validator.address}`}>
          <AddressIdentity className="w-52" addr={validator.address} />
        </Link>
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
        {Math.round(validator.nominatorQuantity).toLocaleString()}
      </td>
      <td className="text-right">
        {Math.round(validator.points).toLocaleString()}
      </td>
      <td className="text-right hidden xl:table-cell">
        <TokenValue value={validator.activeBond} />
      </td>
      <td>
        <button onClick={() => onSelectChange(!validator.selected)}>
          {selectIcon(validator.selected)}
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
          {Math.round(validator.points).toLocaleString()}
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Bond</span>
          : <TokenValue value={validator.activeBond} />
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Nominators</span>:{" "}
          {Math.round(validator.nominatorQuantity).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
