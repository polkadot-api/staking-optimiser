import { AddressIdentity } from "@/components/AddressIdentity";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import { Link } from "react-router-dom";
import { sortedPools$ } from "./poolList.state";

export default function TopPools() {
  const pools = useStateObservable(sortedPools$).slice(0, 10);

  return (
    <div className="data-table compact">
      <table>
        <thead>
          <tr className="bg-background">
            <th></th>
            <th className="w-full">Pool</th>
            <th>Avg APY</th>
            <th>Commission</th>
            <th>Members</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool, idx) => (
            <tr
              key={pool.id}
              className={cn({
                "bg-muted": idx % 2 === 0,
                "bg-destructive/5": pool.state !== "Open",
                "bg-destructive/10": pool.state !== "Open" && idx % 2 === 0,
              })}
            >
              <td>{(pool.position ?? idx) + 1}</td>
              <td>
                <Link to={"../pools/" + pool.id}>
                  <AddressIdentity
                    addr={pool.addresses.pool}
                    name={pool.name}
                  />
                </Link>
              </td>
              <td
                className={cn("text-right font-bold", {
                  "text-positive": pool.avgApy > 0,
                })}
              >
                {formatPercentage(pool.avgApy)}
              </td>
              <td>{formatPercentage(pool.commission.current)}</td>
              <td>{pool.memberCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const topPoolsSub$ = sortedPools$;
