import { lazy, Suspense } from "react";
import { BondInput } from "./BondInput";

const PickValidators = lazy(() => import("./PickValidators"));

export const ManageNomination = () => {
  return (
    <Suspense fallback="Loading…">
      <div className="space-y-2">
        <BondInput />
        <PickValidators />
      </div>
    </Suspense>
  );
};
