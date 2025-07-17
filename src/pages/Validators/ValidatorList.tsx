import { cn } from "@/lib/utils";
import { Subscribe, useStateObservable } from "@react-rxjs/core";
import { SortAsc, SortDesc } from "lucide-react";
import type { SS58String } from "polkadot-api";
import {
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import { TableVirtuoso, Virtuoso, type ItemProps } from "react-virtuoso";
import { Params, SortBy } from "./Params";
import { ValidatorCard, ValidatorRow } from "./Validator";
import {
  setSortBy,
  sortBy$,
  sortedValidators$,
  validatorPrefs$,
  type HistoricValidator,
} from "./validatorList.state";
import { useMediaQuery } from "react-responsive";
import "./validators.css";

export default function ValidatorList() {
  return (
    <div className="space-y-4">
      <Subscribe fallback="Loading…">
        <Params />
      </Subscribe>
      <Subscribe fallback="Loading…" source$={sortedValidators$}>
        <ValidatorsDisplay />
      </Subscribe>
    </div>
  );
}

const ValidatorsDisplay = () => {
  const supportsTable = useMediaQuery({
    query: "(min-width: 768px)",
  });

  const [selection, setSelection] = useState<SS58String[]>([]);
  const validators = useStateObservable(sortedValidators$);

  const sortedValidators = useMemo(() => {
    if (!selection) return validators;
    return validators
      .map((v, i) => ({
        ...v,
        position: i,
        selected: selection.includes(v.address),
      }))
      .sort((a, b) => {
        const diff = (b.selected ? 1 : 0) - (a.selected ? 1 : 0);
        if (diff != 0) return diff;
        return a.position - b.position;
      });
  }, [selection, validators]);

  return supportsTable ? (
    <ValidatorTable
      validators={sortedValidators}
      selection={selection}
      setSelection={setSelection}
    />
  ) : (
    <ValidatorCards
      validators={sortedValidators}
      selection={selection}
      setSelection={setSelection}
    />
  );
};

const TableRow: FC<ItemProps<any>> = ({ item: validator, ...props }) => {
  const prefs = useStateObservable(validatorPrefs$);
  const vPrefs = prefs[validator.address];

  const idx = props["data-index"];

  return (
    <>
      <tr
        {...props}
        className={cn({
          "bg-muted": idx % 2 === 0,
          "bg-destructive/5":
            !vPrefs || vPrefs.blocked || vPrefs.commission === 1,
          "bg-neutral/5": validator.selected,
          "bg-neutral/10": validator.selected && idx % 2 === 0,
        })}
      >
        {props.children}
      </tr>
    </>
  );
};

const ContractableText: FC<PropsWithChildren<{ smol: string }>> = ({
  smol,
  children,
}) => (
  <>
    <span className="hidden min-xl:inline">{children}</span>
    <span className="min-xl:hidden">{smol}</span>
  </>
);

const SortByButton: FC<
  PropsWithChildren<{ prop: keyof HistoricValidator }>
> = ({ prop, children }) => {
  const sortBy = useStateObservable(sortBy$);

  return (
    <button
      className="flex w-full items-center justify-center gap-2"
      onClick={() => {
        if (sortBy.prop === prop) {
          setSortBy({
            ...sortBy,
            dir: sortBy.dir === "asc" ? "desc" : "asc",
          });
        } else {
          setSortBy({
            ...sortBy,
            prop,
          });
        }
      }}
    >
      {children}
      {prop === sortBy.prop ? (
        sortBy.dir === "asc" ? (
          <SortAsc size={20} />
        ) : (
          <SortDesc size={20} />
        )
      ) : null}
    </button>
  );
};

const ValidatorTable: FC<{
  validators: HistoricValidator[];
  selection: SS58String[];
  setSelection: (value: SetStateAction<SS58String[]>) => void;
}> = ({ validators, selection, setSelection }) => {
  return (
    <TableVirtuoso
      className="validator-table"
      customScrollParent={document.getElementById("app-content")!}
      data={validators}
      components={{ TableRow }}
      fixedHeaderContent={() => (
        <tr className="bg-background">
          <th></th>
          <th className="w-52 min-lg:w-60">
            <SortByButton prop="address">Validator</SortByButton>
          </th>
          <th>
            <SortByButton prop="nominatorApy">
              <ContractableText smol="Nom. APY">Nominator APY</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="totalApy">
              <ContractableText smol="Val. APY">Validator APY</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="commission">
              <ContractableText smol="Comm.">Commission</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="reward">Reward</SortByButton>
          </th>
          <th>
            <SortByButton prop="nominatorQuantity">
              <ContractableText smol="# Nom.">Nominators</ContractableText>
            </SortByButton>
          </th>
          <th>
            <SortByButton prop="points">Points</SortByButton>
          </th>
          <th className="hidden min-xl:table-cell">
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
            index={idx}
            selected={selection.includes(v.address)}
            onSelectChange={(c) =>
              setSelection((p) =>
                c ? [...p, v.address] : p.filter((addr) => addr != v.address)
              )
            }
          />
        );
      }}
    />
  );
};

const Item = (props: ItemProps<any>) => <div {...props} className="p-4" />;

const ValidatorCards: FC<{
  validators: HistoricValidator[];
  selection: SS58String[];
  setSelection: (value: SetStateAction<SS58String[]>) => void;
}> = ({ validators, selection, setSelection }) => {
  return (
    <div>
      <SortBy />
      <Virtuoso
        customScrollParent={document.getElementById("app-content")!}
        totalCount={validators.length}
        components={{ Item }}
        itemContent={(idx) => {
          const v = validators[idx];

          if (!v) {
            console.error("no validator!!", idx, validators.length);
            return null;
          }

          return (
            <ValidatorCard
              validator={v}
              selected={selection.includes(v.address)}
              onSelectChange={(c) =>
                setSelection((p) =>
                  c ? [...p, v.address] : p.filter((addr) => addr != v.address)
                )
              }
            />
          );
        }}
      />
    </div>
  );
};
