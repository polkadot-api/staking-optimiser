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

export const Params = () => {
  return (
    <div className="space-y-4 pb-2 border-b">
      <MaParams />
      <SortBy />
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
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label>
          Period
          <Input
            className="w-14 ml-2 inline-block"
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
        <label>
          Avg type:{" "}
          <button
            onClick={() =>
              setMaType(maType === "simple" ? "exponential" : "simple")
            }
          >
            <span className={maType === "simple" ? "font-bold" : ""}>
              Simple
            </span>
            <span>/</span>
            <span className={maType === "exponential" ? "font-bold" : ""}>
              Exponential
            </span>
          </button>
        </label>
        <label>
          Era
          <Input
            type="number"
            className="w-24 ml-2 inline-block"
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
      </div>
      <Slider
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
    </div>
  );
};

const sortOpitons: Partial<Record<keyof HistoricValidator, string>> = {
  nominatorApy: "Nominator APY",
  totalApy: "Validator APY",
  points: "Points",
  activeBond: "Bond",
  nominatorQuantity: "Nominators",
};

const SortBy = () => {
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
    <div>
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
          <Input
            type="number"
            className="inline-block w-20"
            min={0}
            max={100}
            step={1}
            value={filterCommission}
            onChange={(evt) => setFilterCommission(evt.target.valueAsNumber)}
          />
        </label>
      </div>
      <label>
        <Switch
          checked={filterBlocked}
          onCheckedChange={() => setFilterBlocked(!filterBlocked)}
        />{" "}
        Filter Blocked
      </label>
    </div>
  );
};
