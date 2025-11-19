import { AddressIdentity } from "@/components/AddressIdentity"
import { activeEraNumber$ } from "@/state/era"
import { validatorsEra$ } from "@/state/validators"
import { formatPercentage } from "@/util/format"
import { state, useStateObservable } from "@react-rxjs/core"
import { Link } from "react-router"
import { combineLatest, filter, map, switchMap } from "rxjs"
import { validatorPrefs$ } from "./validatorList.state"

const topValidators$ = state(
  combineLatest([
    activeEraNumber$.pipe(
      switchMap((era) => validatorsEra$(era - 1)),
      map((v) => [...v].sort((a, b) => b.nominatorApy - a.nominatorApy)),
    ),
    validatorPrefs$.pipe(filter((prefs) => Object.keys(prefs).length > 0)),
  ]).pipe(
    map(([validators, prefs]) =>
      validators
        .filter((v) => prefs[v.address]?.blocked === false)
        .slice(0, 10),
    ),
  ),
)

export default function TopValidators() {
  const validators = useStateObservable(topValidators$)

  return (
    <ol className="space-y-4">
      {validators.map((v) => (
        <li key={v.address} className="shadow rounded-xl p-2 space-y-2">
          <Link to={"../validators/" + v.address}>
            <AddressIdentity addr={v.address} />
          </Link>
          <div className="flex gap-4 justify-center">
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                APY
              </h4>
              <div className="text-center">
                {formatPercentage(v.nominatorApy)}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                Commission
              </h4>
              <div className="text-center">
                {formatPercentage(v.commission)}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                Nominators
              </h4>
              <div className="text-center">
                {v.nominatorCount.toLocaleString()}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export const topValidatorsSub$ = topValidators$
