import { lazy, Suspense } from "react";
import { BondInput } from "./BondInput";
import { CardPlaceholder } from "@/components/CardPlaceholder";

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
