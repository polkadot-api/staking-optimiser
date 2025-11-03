import { AddressIdentity } from "@/components/AddressIdentity"
import { TokenValue } from "@/components/TokenValue"
import { cn } from "@/lib/utils"
import { formatPercentage } from "@/util/format"
import { useStateObservable } from "@react-rxjs/core"
import { createContext, useContext, type FC, type ReactElement } from "react"
import {
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "./validatorList.state"
import { Link, useParams } from "react-router-dom"
import { Skeleton as OSkeleton } from "@/components/ui/skeleton"

const whiteCtx = createContext(false)

const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <OSkeleton className={cn({ "bg-white": useContext(whiteCtx) }, className)} />
)

export const ValidatorRowSkeleton: FC<{
  hideValApy?: boolean
  isWhite: boolean
}> = ({ hideValApy, isWhite }) => {
  return (
    <whiteCtx.Provider value={isWhite}>
      <td className="text-muted-foreground">
        <Skeleton className="h-4 w-6" />
      </td>
      <td className="overflow-hidden">
        <Skeleton className="h-10 w-10 rounded-full" />
      </td>
      <td className="text-right font-bold">
        <Skeleton className="h-4 w-16" />
      </td>
      {hideValApy ? null : (
        <td className="text-right">
          <Skeleton className="h-4 w-16" />
        </td>
      )}
      <td className="text-right">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="text-right">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="text-right">
        <Skeleton className="h-4 w-8" />
      </td>
      <td className="text-right">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="text-right hidden xl:table-cell">
        <Skeleton className="h-4 w-16" />
      </td>
      <td></td>
    </whiteCtx.Provider>
  )
}

export const ValidatorRow: FC<{
  validator: PositionValidator
  onSelectChange: (value: boolean) => void
  selectIcon: (selected: boolean) => ReactElement
  hideValApy?: boolean
}> = ({ validator, onSelectChange, selectIcon, hideValApy }) => {
  const { chain } = useParams()
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
      {hideValApy ? null : (
        <td className="text-right">{formatPercentage(validator.totalApy)}</td>
      )}
      <td className="text-right">{formatPercentage(validator.commission)}</td>
      <td
        className={cn("text-right", {
          "text-warning": validator.active < 0.5,
        })}
      >
        {formatPercentage(validator.active)}
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
  )
}

export const ValidatorCardSkeleton = () => {
  return (
    <div className="shadow p-2 rounded space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">
            Nominator APY
          </span>
          :{" "}
          <span className="font-bold">
            <Skeleton className="h-4 w-10" />
          </span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">
            Validator APY:
          </span>
          <Skeleton className="h-4 w-10" />
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Commission:</span>{" "}
          <Skeleton className="h-4 w-10" />
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Active</span>:{" "}
          <span>
            <Skeleton className="h-4 w-10" />
          </span>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Points</span>:{" "}
          <Skeleton className="h-4 w-10" />
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Bond</span>
          : <Skeleton className="h-4 w-16" />
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Nominators</span>:{" "}
          <Skeleton className="h-4 w-8" />
        </div>
      </div>
    </div>
  )
}

export const ValidatorCard: FC<{
  validator: HistoricValidator
}> = ({ validator }) => {
  const prefs = useStateObservable(validatorPrefs$)

  const vPrefs = prefs[validator.address]

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
          <span className="font-medium text-muted-foreground">Active</span>:{" "}
          <span
            className={cn({
              "text-warning": validator.active < 0.5,
            })}
          >
            {formatPercentage(validator.active)}
          </span>
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
  )
}
