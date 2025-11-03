import { AddressIdentity } from "@/components/AddressIdentity"
import { activeEraNumber$ } from "@/state/era"
import { validatorsEra$ } from "@/state/validators"
import { formatPercentage } from "@/util/format"
import { state, useStateObservable } from "@react-rxjs/core"
import { combineLatest, map, switchMap } from "rxjs"
import { validatorRewardsToHistoric } from "../Validators/validatorList.state"
import { calculatePoolApy, pools$ } from "./poolList.state"
import { Link } from "react-router-dom"

const topPools$ = state(
  combineLatest([
    activeEraNumber$.pipe(
      switchMap((era) => validatorsEra$(era - 1)),
      map((validators) => validators.map(validatorRewardsToHistoric)),
      map((validators) =>
        Object.fromEntries(validators.map((v) => [v.address, v])),
      ),
    ),
    pools$,
  ]).pipe(
    map(([validators, pools]) =>
      pools
        .map((pool) => calculatePoolApy(pool, validators))
        .sort((a, b) => b.avgApy - a.avgApy)
        .slice(0, 10),
    ),
  ),
)

export default function TopPools() {
  const pools = useStateObservable(topPools$)

  return (
    <ol className="space-y-4">
      {pools.map((p) => (
        <li key={p.id} className="shadow rounded-xl p-2 space-y-2">
          <Link to={"../pools/" + p.id} className="flex items-center gap-2">
            <div>#{p.id}</div>
            <AddressIdentity
              className="whitespace-nowrap"
              addr={p.addresses.pool}
              name={p.name}
            />
          </Link>
          <div className="flex gap-4 justify-center">
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                APY
              </h4>
              <div className="text-center">{formatPercentage(p.avgApy)}</div>
            </div>
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                Commission
              </h4>
              <div className="text-center">
                {formatPercentage(p.commission.current)}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-center text-muted-foreground">
                Members
              </h4>
              <div className="text-center">
                {p.memberCount.toLocaleString()}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export const topPoolsSub$ = topPools$
