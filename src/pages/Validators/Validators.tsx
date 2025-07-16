import { NavMenu } from "@/components/NavMenu/NavMenu";
import { lazy, Suspense } from "react";

const ValidatorList = lazy(() => import("./ValidatorList"));

export const Validators = () => {
  return (
    <div className="space-y-4">
      <NavMenu />
      <Suspense fallback="Loading…">
        <ValidatorList />
      </Suspense>
    </div>
  );
};
