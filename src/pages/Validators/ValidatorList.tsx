import { Subscribe, useStateObservable } from "@react-rxjs/core";
import type { SS58String } from "polkadot-api";
import { forwardRef, useState } from "react";
import { VirtuosoGrid, type GridListProps } from "react-virtuoso";
import { Params } from "./Params";
import { Validator } from "./Validator";
import { sortedValidators$ } from "./validatorList.state";

export default function ValidatorList() {
  return (
    <div className="space-y-4">
      <Subscribe fallback="Loading…">
        <Params />
      </Subscribe>
      <Subscribe fallback="Loading…">
        <ValidatorGrid />
      </Subscribe>
    </div>
  );
}

const gridComponents = {
  List: forwardRef<HTMLDivElement, GridListProps>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...props} className="flex flex-wrap justify-around gap-4">
        {children}
      </div>
    )
  ),
};

const ValidatorGrid = () => {
  const [selection, setSelection] = useState<SS58String[]>([]);
  const validators = useStateObservable(sortedValidators$);

  return (
    <VirtuosoGrid
      customScrollParent={document.getElementById("app-content")!}
      totalCount={validators.length}
      components={gridComponents}
      itemContent={(idx) => {
        const v = validators[idx];

        if (!v) {
          console.error("no validator!!", idx, validators.length);
          return null;
        }

        return (
          <Validator
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
  );
};
