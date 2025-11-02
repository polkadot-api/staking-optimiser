import { AddressIdentity } from "@/components/AddressIdentity";
import { Card } from "@/components/Card";
import { ContractableText, createSortByButton } from "@/components/SortBy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@/util/format";
import { useStateObservable } from "@react-rxjs/core";
import { Search, Square, SquareCheck, X } from "lucide-react";
import { useMemo, type FC } from "react";
import { useMediaQuery } from "react-responsive";
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso";
import { merge } from "rxjs";
import { MaParams, maParamsSub$, SortBy } from "../Validators/Params";
import { ValidatorCard, ValidatorRow } from "../Validators/Validator";
import {
  validatorPrefs$,
  type HistoricValidator,
  type PositionValidator,
} from "../Validators/validatorList.state";
import { NominateButton } from "./NominateButton";
import {
  MAX_VALIDATORS,
  search$,
  selectedValidators$,
  setSearch,
  setSortBy,
  sortBy$,
  sortedValidators$,
  toggleValidator,
  validatorsWithPreferences$,
} from "./pickValidators.state";

const SortByButton = createSortByButton(sortBy$, setSortBy);

export default function PickValidators() {
  const search = useStateObservable(search$);

  return (
    <div className="space-y-4">
      <Selection />
      <div className="space-y-4 pb-2 md:space-y-0 md:flex gap-2 justify-stretch">
        <Card title="Data Options" className="basis-xl grow">
          <MaParams />
        </Card>
        <Card title="Search" className="basis-lg">
          <label className="flex items-center gap-2">
            <Search />
            <Input
              value={search}
              onChange={(evt) => setSearch(evt.target.value)}
            />
          </label>
        </Card>
      </div>
      <ValidatorsDisplay />
    </div>
  );
}

export const pickValidatorsSub$ = merge(
  maParamsSub$,
  selectedValidators$,
  validatorsWithPreferences$,
  sortedValidators$
);

const Selection = () => {
  const selection = useStateObservable(selectedValidators$);
  const selectionArr = Array.from(selection);
  const validators = useStateObservable(validatorsWithPreferences$);
  const sortedValidators = useStateObservable(sortedValidators$);

  const validatorByAddr = useMemo(
    () => Object.fromEntries(validators.map((v) => [v.address, v])),
    [validators]
  );

  const slots = new Array(Math.max(MAX_VALIDATORS, selectionArr.length))
    .fill(0)
    .map((_, i) => selectionArr[i] || null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3>You can select up to {MAX_VALIDATORS} validators</h3>
        <NominateButton />
      </div>
      <ul className="flex flex-wrap gap-2 justify-evenly">
        {slots.map((selection, i) => {
          const isActive = selection
            ? validatorByAddr[selection]?.prefs != null
            : false;
          const apy = isActive ? validatorByAddr[selection!].nominatorApy : 0;

          // TODO red the blocked ones if they were previously blocked? Figure out if they can be sent if they were already previously set.
          const invalid = (selection && !isActive) || i >= MAX_VALIDATORS;

          return (
            <li
              key={i}
              className={cn(
                "border border-muted-foreground/50 rounded-lg p-2 w-xs h-12 flex items-center justify-between",
                {
                  "border-neutral": !!selection,
                  "border-destructive": invalid,
                  "bg-destructive/5": invalid,
                }
              )}
            >
              {selection ? (
                <>
                  <AddressIdentity addr={selection} />
                  <div className="flex items-center gap-2">
                    <div className="text-sm">APY: {formatPercentage(apy)}</div>
                    <button
                      className="text-destructive"
                      onClick={() => toggleValidator(selection)}
                    >
                      <X />
                    </button>
                  </div>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant="secondary"
          onClick={() => {
            const selected = new Set(selection);
            for (
              let i = 0;
              i < sortedValidators.length && selected.size < MAX_VALIDATORS;
              i++
            ) {
              const addr = sortedValidators[i].address;
              if (selected.has(addr)) continue;
              selected.add(addr);
              toggleValidator(addr);
            }
          }}
        >
          Fill with top
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const unselectedTop10 = sortedValidators
              .slice(0, Math.round(sortedValidators.length / 10))
              .filter((v) => !selection.has(v.address));
            for (let i = 0; i < MAX_VALIDATORS - selection.size; i++) {
              const [pick] = unselectedTop10.splice(
                Math.floor(Math.random() * unselectedTop10.length),
                1
              );
              toggleValidator(pick.address);
            }
          }}
        >
          Fill with random top 10%
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (selection.size === MAX_VALIDATORS) return;
            const unselectedTop10 = sortedValidators
              .slice(0, Math.round(sortedValidators.length / 10))
              .filter((v) => !selection.has(v.address));
            const pick =
              unselectedTop10[
                Math.floor(Math.random() * unselectedTop10.length)
              ];
            toggleValidator(pick.address);
          }}
        >
          Pick random top 10%
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            for (const validator of selection) {
              toggleValidator(validator);
            }
          }}
        >
          Remove all
        </Button>
      </div>
    </div>
  );
};

const ValidatorsDisplay = () => {
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  });

  const selection = useStateObservable(selectedValidators$);
  const validators = useStateObservable(sortedValidators$);

  const sortedValidators = useMemo(() => {
    return validators.map(
      (v, i): PositionValidator => ({
        ...v,
        position: v.position ?? i,
        selected: selection.has(v.address),
      })
    );
  }, [selection, validators]);

  return supportsTable ? (
    <ValidatorTable validators={sortedValidators} />
  ) : (
    <ValidatorCards validators={sortedValidators} />
  );
};

const TableRow: FC<ItemProps<HistoricValidator & { selected: boolean }>> = ({
  item: validator,
  ...props
}) => {
  const prefs = useStateObservable(validatorPrefs$);
  const vPrefs = prefs[validator.address];

  const idx = props["data-index"];

  return (
    <>
      <tr
        {...props}
        className={cn({
          "bg-muted": idx % 2 === 0,
          "bg-destructive/5": !vPrefs || vPrefs.blocked,
          "bg-destructive/10": (!vPrefs || vPrefs.blocked) && idx % 2 === 0,
          "bg-neutral/5": validator.selected,
          "bg-neutral/10": validator.selected && idx % 2 === 0,
        })}
      >
        {props.children}
      </tr>
    </>
  );
};

const ValidatorTable: FC<{
  validators: PositionValidator[];
  className?: string;
}> = ({ validators, className }) => {
  return (
    <TableVirtuoso
      className={cn("data-table", className)}
      customScrollParent={
        document.getElementById("dialog-content") ??
        document.getElementById("app-content")!
      }
      data={validators}
      components={{ TableRow }}
      fixedHeaderContent={() => (
        <tr className="bg-background">
          <th></th>
          <th className="w-52 lg:w-60">
            <SortByButton prop="address">Validator</SortByButton>
          </th>
          <th className="max-w-[10%]">
            <SortByButton prop="nominatorApy">
              <ContractableText smol="Nom. APY">Nominator APY</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="commission">
              <ContractableText smol="Comm.">Commission</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="active">Active</SortByButton>
          </th>
          <th>
            <SortByButton prop="nominatorQuantity">
              <ContractableText smol="# Nom.">Nominators</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="points">Points</SortByButton>
          </th>
          <th className="hidden xl:table-cell">
            <SortByButton prop="activeBond">Active bond</SortByButton>
          </th>
          <th></th>
        </tr>
      )}
      itemContent={(idx, v) => {
        if (!v) {
          console.error("no validator!!", idx, validators.length);
          return null;
        }

        return (
          <ValidatorRow
            validator={v}
            onSelectChange={() => toggleValidator(v.address)}
            selectIcon={(selected) =>
              selected ? (
                <SquareCheck className="text-positive" />
              ) : (
                <Square className="text-muted-foreground" />
              )
            }
            hideValApy
          />
        );
      }}
    />
  );
};

const Item = (props: ItemProps<any>) => <div {...props} className="p-4" />;

const ValidatorCards: FC<{
  validators: PositionValidator[];
}> = ({ validators }) => {
  return (
    <div>
      <SortBy />
      <Virtuoso
        customScrollParent={
          document.getElementById("dialog-content") ??
          document.getElementById("app-content")!
        }
        totalCount={validators.length}
        components={{ Item }}
        itemContent={(idx) => {
          const v = validators[idx];

          if (!v) {
            console.error("no validator!!", idx, validators.length);
            return null;
          }

          return <ValidatorCard validator={v} />;
        }}
      />
    </div>
  );
};
