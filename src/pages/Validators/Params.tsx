import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeEraNumber$ } from "@/state/era";
import { useStateObservable } from "@react-rxjs/core";
import { Search, SortAsc, SortDesc } from "lucide-react";
import {
  filterBlocked$,
  filterCommision$,
  maPeriod$,
  maType$,
  search$,
  selectedEra$,
  setEra,
  setFilterBlocked,
  setFilterCommission,
  setMaPeriod,
  setMaType,
  setSearch,
  setSortBy,
  sortBy$,
  type HistoricValidator,
} from "./validatorList.state";
import { Card } from "@/components/Card";
import { merge } from "rxjs";
import { EraRangeSlider } from "@/components/EraRangeSlider";

export const Params = () => {
  return (
    <div className="space-y-4 pb-2 md:space-y-0 md:flex gap-2 justify-stretch">
      <Card title="Data Options" className="grow">
        <MaParams />
      </Card>
      <Card title="Filters" className="grow">
        <Filters />
      </Card>
    </div>
  );
};

export const MaParams = () => {
  const period = useStateObservable(maPeriod$);
  const activeEraNumber = useStateObservable(activeEraNumber$);
  const selectedEra = useStateObservable(selectedEra$);
  const maType = useStateObservable(maType$);

  return (
    <div className="flex items-center gap-6">
      <div className="min-w-0 flex-1">
        <EraRangeSlider
          minEra={activeEraNumber - 21}
          maxEra={activeEraNumber - 1}
          startEra={selectedEra - period}
          endEra={selectedEra}
          onRangeChange={(start, end) => {
            setMaPeriod(end - start);
            setEra(end);
          }}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Avg type
        </span>
        <ToggleGroup
          value={maType}
          type="single"
          onValueChange={(value) => setMaType(value as any)}
        >
          <ToggleGroupItem value="simple">SMA</ToggleGroupItem>
          <ToggleGroupItem value="exponential">EMA</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
export const maParamsSub$ = merge(activeEraNumber$, selectedEra$);

const sortOpitons: Partial<Record<keyof HistoricValidator, string>> = {
  nominatorApy: "Nominator APY",
  totalApy: "Validator APY",
  points: "Points",
  activeBond: "Bond",
  nominatorQuantity: "Nominators",
};

export const SortBy = () => {
  const sortBy = useStateObservable(sortBy$);

  return (
    <div>
      <ToggleGroup
        variant="outline"
        type="single"
        value={sortBy.prop}
        onValueChange={(value) => {
          if (value === "") {
            setSortBy({
              ...sortBy,
              dir: sortBy.dir === "asc" ? "desc" : "asc",
            });
          } else {
            setSortBy({
              ...sortBy,
              prop: value as any,
            });
          }
        }}
        className="w-auto justify-start"
        style={{ boxShadow: "none" }}
      >
        {Object.entries(sortOpitons).map(([key, label]) => (
          <ToggleGroupItem
            key={key}
            value={key}
            className="w-auto flex-auto grow-0"
            aria-label={label}
          >
            {label}{" "}
            {key === sortBy.prop ? (
              sortBy.dir === "asc" ? (
                <SortAsc />
              ) : (
                <SortDesc />
              )
            ) : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

const Filters = () => {
  const filterBlocked = useStateObservable(filterBlocked$);
  const filterCommission = useStateObservable(filterCommision$);
  const search = useStateObservable(search$);

  return (
    <div>
      <label className="block py-4">
        <Switch
          checked={filterBlocked}
          onCheckedChange={() => setFilterBlocked(!filterBlocked)}
        />{" "}
        Filter Blocked
      </label>
      <div>
        <label className="flex items-center gap-2">
          Commission
          <Slider
            className="max-w-40"
            min={0}
            max={100}
            step={1}
            value={[filterCommission]}
            onValueChange={([value]) => setFilterCommission(value)}
          />
          <div>{filterCommission.toLocaleString()}%</div>
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2">
          <Search />
          <Input
            value={search}
            onChange={(evt) => setSearch(evt.target.value)}
          />
        </label>
      </div>
    </div>
  );
};
