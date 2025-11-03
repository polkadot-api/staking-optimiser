import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { activeEraNumber$ } from "@/state/era"
import { useStateObservable } from "@react-rxjs/core"
import { Search, SortAsc, SortDesc } from "lucide-react"
import {
  filterBlocked$,
  filterCommision$,
  maType$,
  search$,
  selectedEraAndPeriod$,
  setEraAndPeriod,
  setFilterBlocked,
  setFilterCommission,
  setMaType,
  setSearch,
  setSortBy,
  sortBy$,
  type HistoricValidator,
} from "./validatorList.state"
import { Card } from "@/components/Card"
import { merge } from "rxjs"
import { EraRangeSlider } from "@/components/EraRangeSlider"

export const Params = () => {
  return (
    <div className="space-y-4 pb-2 md:space-y-0 md:flex gap-2 justify-stretch">
      <Card title="DataOptions" className="grow">
        <MaParams />
      </Card>
      <FiltersNew />
    </div>
  )
}

export const MaParams = () => {
  const { period, era } = useStateObservable(selectedEraAndPeriod$)
  const activeEraNumber = useStateObservable(activeEraNumber$)
  const maType = useStateObservable(maType$)

  return (
    <div className="flex items-center gap-6">
      <div className="min-w-0 flex-1">
        <EraRangeSlider
          minEra={activeEraNumber - 21}
          maxEra={activeEraNumber - 1}
          startEra={era - period}
          endEra={era}
          onRangeChange={(start, end) => {
            setEraAndPeriod({ era: end, period: end - start })
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
  )
}
export const maParamsSub$ = merge(activeEraNumber$, selectedEraAndPeriod$)

const sortOpitons: Partial<Record<keyof HistoricValidator, string>> = {
  nominatorApy: "Nominator APY",
  totalApy: "Validator APY",
  points: "Points",
  activeBond: "Bond",
  nominatorQuantity: "Nominators",
}

export const SortBy = () => {
  const sortBy = useStateObservable(sortBy$)

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
            })
          } else {
            setSortBy({
              ...sortBy,
              prop: value as any,
            })
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
  )
}

function FiltersNew() {
  const filterBlocked = useStateObservable(filterBlocked$)
  const filterCommission = useStateObservable(filterCommision$)
  const search = useStateObservable(search$)

  return (
    <div className="shadow rounded-xl bg-card text-card-foreground p-4 grow">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-muted-foreground">Filters</h3>
          <div className="flex items-center gap-2">
            <label
              htmlFor="filter-blocked"
              className="text-sm font-normal cursor-pointer"
            >
              Filter Blocked
            </label>
            <Switch
              id="filter-blocked"
              checked={filterBlocked}
              onCheckedChange={setFilterBlocked}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[240px]">
            <label htmlFor="commission-slider" className="text-sm font-medium">
              Commission
            </label>
            <div className="flex items-center gap-2">
              <Slider
                id="commission-slider"
                value={[filterCommission]}
                onValueChange={([value]) => setFilterCommission(value)}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium tabular-nums w-12 text-right">
                {filterCommission}%
              </span>
            </div>
          </div>

          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(evt) => setSearch(evt.target.value)}
              className="pl-9"
            />
          </div>
        </div>{" "}
      </div>
    </div>
  )
}
