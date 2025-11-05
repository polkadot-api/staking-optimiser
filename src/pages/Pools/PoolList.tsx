import { AddressIdentity } from "@/components/AddressIdentity"
import { Card } from "@/components/Card"
import { ContractableText, createSortByButton } from "@/components/SortBy"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatPercentage } from "@/util/format"
import { useStateObservable } from "@react-rxjs/core"
import { Search } from "lucide-react"
import type { FC } from "react"
import { useMediaQuery } from "react-responsive"
import { Link } from "react-router-dom"
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso"
import { merge } from "rxjs"
import { MaParams, maParamsSub$ } from "../Validators/Params"
import {
  search$,
  setSearch,
  setSortBy,
  sortBy$,
  sortedPools$,
  type NominationPool,
  type PositionedPool,
} from "./poolList.state"

const SortByButton = createSortByButton(sortBy$, setSortBy)

export default function PoolList() {
  return (
    <div className="space-y-4 px-2">
      <h3 className="text-lg font-medium text-muted-foreground">
        Nomination Pools List
      </h3>
      <div className="flex flex-wrap gap-4">
        <Card title="Data Options" className="grow">
          <MaParams />
        </Card>
        <SearchCard />
      </div>
      <PoolsDisplay />
    </div>
  )
}

export const poolListSub$ = merge(maParamsSub$, sortedPools$)

const SearchCard = () => {
  const search = useStateObservable(search$)

  return (
    <Card title="Search" className="grow">
      <div>
        <label className="flex items-center gap-2">
          <Search />
          <Input
            value={search}
            onChange={(evt) => setSearch(evt.target.value)}
          />
        </label>
      </div>
    </Card>
  )
}

const PoolsDisplay = () => {
  const pools = useStateObservable(sortedPools$)
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  })

  return supportsTable ? (
    <PoolsTable pools={pools} />
  ) : (
    <PoolCards pools={pools} />
  )
}

const PoolsTable: FC<{ pools: PositionedPool[] }> = ({ pools }) => (
  <TableVirtuoso
    className="data-table"
    customScrollParent={document.getElementById("app-content")!}
    data={pools}
    components={{ TableRow }}
    fixedHeaderContent={() => (
      <tr className="bg-background">
        <th></th>
        <th className="w-full">
          <SortByButton prop="name">Pool</SortByButton>
        </th>
        <th>
          <SortByButton prop="avgApy">Avg APY</SortByButton>
        </th>
        <th>
          <SortByButton prop="maxApy">Max APY</SortByButton>
        </th>
        <th>
          <SortByButton prop="minApy">Min APY</SortByButton>
        </th>
        <th>
          <SortByButton prop="commission">
            <ContractableText smol="Comm.">Commission</ContractableText>
          </SortByButton>
        </th>
        <th>
          <SortByButton prop="memberCount">Members</SortByButton>
        </th>
      </tr>
    )}
    itemContent={(idx, pool) => {
      if (!pool) {
        console.error("no pool!!", idx, pools.length)
        return null
      }

      return (
        <>
          <td>{(pool.position ?? idx) + 1}</td>
          <td>
            <Link to={pool.id.toString()}>
              <AddressIdentity
                addr={pool.addresses.pool}
                name={`${pool.name} (#${pool.id})`}
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
          <td>{formatPercentage(pool.maxApy)}</td>
          <td>{formatPercentage(pool.minApy)}</td>
          <td>{formatPercentage(pool.commission.current)}</td>
          <td>{pool.memberCount}</td>
        </>
      )
    }}
  />
)

const TableRow: FC<ItemProps<NominationPool>> = ({ item: pool, ...props }) => {
  const idx = props["data-index"]

  return (
    <>
      <tr
        {...props}
        className={cn({
          "bg-muted": idx % 2 === 0,
          "bg-destructive/5": pool.state !== "Open",
          "bg-destructive/10": pool.state !== "Open" && idx % 2 === 0,
        })}
      >
        {props.children}
      </tr>
    </>
  )
}

const Item = (props: ItemProps<any>) => <div {...props} className="p-4 px-2" />

const PoolCards: FC<{
  pools: PositionedPool[]
}> = ({ pools }) => {
  return (
    <Virtuoso
      customScrollParent={document.getElementById("app-content")!}
      totalCount={pools.length}
      components={{ Item }}
      itemContent={(idx) => {
        const v = pools[idx]
        return v ? <PoolCard pool={v} /> : null
      }}
    />
  )
}
const PoolCard: FC<{
  pool: PositionedPool
}> = ({ pool }) => (
  <div
    className={cn("shadow p-2 rounded space-y-4", {
      "bg-warning/5": pool.state === "Blocked",
      "bg-destructive/5": pool.state === "Destroying",
    })}
  >
    <div className="flex items-center justify-between">
      <Link className="flex items-center gap-1" to={pool.id.toString()}>
        {pool.position != null ? (
          <div className="text-muted-foreground">#{pool.position + 1}</div>
        ) : null}
        <AddressIdentity
          addr={pool.addresses.pool}
          name={`${pool.name} ${pool.id}`}
        />
      </Link>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <div>
        <span className="font-medium text-muted-foreground">Avg APY</span>:{" "}
        <span
          className={cn("font-bold", {
            "text-positive": pool.avgApy > 0,
          })}
        >
          {formatPercentage(pool.avgApy)}
        </span>
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Max APY:</span>{" "}
        {formatPercentage(pool.maxApy)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Min APY:</span>{" "}
        {formatPercentage(pool.minApy)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Commission</span>:{" "}
        {formatPercentage(pool.commission.current)}
      </div>
      <div>
        <span className="font-medium text-muted-foreground">Members</span>:{" "}
        {pool.memberCount}
      </div>
    </div>
  </div>
)
