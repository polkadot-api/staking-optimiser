import { CardPlaceholder } from "@/components/CardPlaceholder";
import { lazy, Suspense } from "react";
import { merge } from "rxjs";
import { BondInput, bondInputSub$ } from "./BondInput";
import { pickValidatorsSub$ } from "./PickValidators";

const PickValidators = lazy(() => import("./PickValidators"));

export const ManageNomination = () => {
  return (
    <Suspense fallback={<ManageNominationSkeleton />}>
      <div className="space-y-2">
        <BondInput />
        <PickValidators />
      </div>
    </Suspense>
  );
};

export const manageNominationSub$ = merge(bondInputSub$, pickValidatorsSub$);

const ManageNominationSkeleton = () => {
  return (
    <div className="space-y-2">
      <CardPlaceholder height={165} />
      <CardPlaceholder height={430} />
      <CardPlaceholder height={150} />
      <CardPlaceholder />
    </div>
  );
};
