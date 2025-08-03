import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { ContractableText, createSortByButton } from "@/components/SortBy";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import { Search } from "lucide-react";
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

const SortByButton = createSortByButton(sortBy$, setSortBy);

export default function PoolList() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-muted-foreground">
        Nomination Pools List
      </h3>
      <div className="flex flex-wrap gap-4">
        <Card title="Data Options" className="grow">
          <MaParams />
        </Card>
        <SearchCard />
      </div>
      <PoolsTable />
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
