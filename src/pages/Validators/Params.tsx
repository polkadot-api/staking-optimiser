import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { activeEraNumber$ } from "@/state/era";
import { useStateObservable } from "@react-rxjs/core";
import { SortAsc, SortDesc } from "lucide-react";
import { useEffect, useState } from "react";
import {
  filterBlocked$,
  filterCommision$,
  maPeriod$,
  maType$,
  selectedEra$,
  setEra,
  setFilterBlocked,
  setFilterCommission,
  setMaPeriod,
  setMaType,
  setSortBy,
  sortBy$,
  type HistoricValidator,
} from "./validatorList.state";
import { Card } from "@/components/Card";

export const Params = () => {
  return (
    <div className="space-y-4 pb-2 min-md:space-y-0 min-md:flex gap-2 justify-stretch">
      <MaParams />
      <Filters />
    </div>
  );
};

const MaParams = () => {
  const period = useStateObservable(maPeriod$);
  const activeEraNumber = useStateObservable(activeEraNumber$);
  const selectedEra = useStateObservable(selectedEra$);
  const maType = useStateObservable(maType$);

  const [sliderValue, setSliderValue] = useState([
    selectedEra - period,
    selectedEra,
  ]);
  const [sliderFocused, setSliderFocused] = useState(false);

  const resetSliderState = () => {
    setSliderValue([selectedEra - period, selectedEra]);
  };

  useEffect(() => {
    if (sliderFocused) return;
    resetSliderState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sliderFocused, period, selectedEra]);

  return (
    <Card title="Data Options" className="grow">
      <div className="flex gap-2 items-center justify-center mb-4">
        <label className="flex flex-col overflow-hidden">
          <div className="text-muted-foreground">Era</div>
          <Input
            type="number"
            value={selectedEra}
            onChange={(evt) =>
              evt.target.valueAsNumber &&
              setEra(
                Math.round(
                  Math.max(
                    Math.min(evt.target.valueAsNumber, activeEraNumber - 1),
                    activeEraNumber - 21
                  )
                )
              )
            }
          />
        </label>
        <label className="flex flex-col overflow-hidden">
          <div className="text-muted-foreground">Period</div>
          <Input
            type="number"
            value={period}
            onChange={(evt) =>
              evt.target.valueAsNumber &&
              setMaPeriod(
                Math.round(Math.max(Math.min(evt.target.valueAsNumber, 21), 1))
              )
            }
          />
        </label>
        <label className="flex flex-col overflow-hidden shrink-0">
          <div className="text-muted-foreground">Avg type</div>
          <ToggleGroup
            value={maType}
            type="single"
            onValueChange={(value) => setMaType(value as any)}
          >
            <ToggleGroupItem value="simple">SMA</ToggleGroupItem>
            <ToggleGroupItem value="exponential">EMA</ToggleGroupItem>
          </ToggleGroup>
        </label>
      </div>
      <Slider
        className="max-md:hidden"
        value={sliderValue}
        min={activeEraNumber - 21}
        max={activeEraNumber - 1}
        step={0.01}
        onFocus={() => setSliderFocused(true)}
        onBlur={() => setSliderFocused(false)}
        onValueChange={([start, nextFloatEra]) => {
          if (nextFloatEra != sliderValue[1]) {
            setSliderValue([nextFloatEra - period, nextFloatEra]);
            const nextEra = Math.round(nextFloatEra);
            if (nextEra != selectedEra) setEra(nextEra);
          } else {
            const newFloatPeriod = Math.max(1, nextFloatEra - start);
            setSliderValue([nextFloatEra - newFloatPeriod, nextFloatEra]);

            const newPeriod = Math.round(newFloatPeriod);
            if (newPeriod != period) setMaPeriod(newPeriod);
          }
        }}
        onValueCommit={resetSliderState}
      />
    </Card>
  );
};

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

  return (
    <Card title="Filters" className="grow">
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
    </Card>
  );
};
