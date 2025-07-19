import { ContractableText, createSortByButton } from "@/components/SortBy";
import { cn } from "@/lib/utils";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import type { FC } from "react";
import { TableVirtuoso, type ItemProps } from "react-virtuoso";
import { MaParams } from "../Validators/Params";
import {
  search$,
  setSearch,
  setSortBy,
  sortBy$,
  sortedPools$,
  type NominationPool,
} from "./poolList.state";
import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const SortByButton = createSortByButton(sortBy$, setSortBy);

export default function PoolList() {
  return (
    <div className="space-y-4">
      <Subscribe fallback="Loading…">
        <div className="flex flex-wrap gap-4">
          <MaParams />
          <SearchCard />
        </div>
      </Subscribe>
      <Subscribe fallback="Loading…">
        <PoolsTable />
      </Subscribe>
    </div>
  );
}

const SearchCard = () => {
  const search = useStateObservable(search$);

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
  );
};

const PoolsTable = () => {
  const pools = useStateObservable(sortedPools$);

  return (
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
            <SortByButton prop="members">Members</SortByButton>
          </th>
        </tr>
      )}
      itemContent={(idx, pool) => {
        if (!pool) {
          console.error("no validator!!", idx, pools.length);
          return null;
        }

        return (
          <>
            <td>{(pool.position ?? idx) + 1}</td>
            <td>
              <div className="flex items-center gap-2">
                <div className="text-sm">#{pool.id}</div>
                <AddressIdentity addr={pool.address} name={pool.name} />
              </div>
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
            <td>{formatPercentage(pool.commission)}</td>
            <td>{pool.members}</td>
          </>
        );
      }}
    />
  );
};

const formatPercentage = (value: number) =>
  (value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + "%";

const TableRow: FC<ItemProps<NominationPool>> = ({ item: pool, ...props }) => {
  const idx = props["data-index"];

  return (
    <>
      <tr
        {...props}
        className={cn({
          "bg-muted": idx % 2 === 0,
          "bg-destructive/5": pool.state.type !== "Open",
          "bg-destructive/10": pool.state.type !== "Open" && idx % 2 === 0,
        })}
      >
        {props.children}
      </tr>
    </>
  );
};
