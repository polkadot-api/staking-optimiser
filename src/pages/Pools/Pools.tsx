import { NavMenu } from "@/components/NavMenu/NavMenu";
import { lazy, Suspense } from "react";

const PoolList = lazy(() => import("./PoolList"));

export const Pools = () => {
  return (
    <div>
      <NavMenu />
      <Suspense fallback="Loading…">
        <PoolList />
      </Suspense>
    </div>
  );
};
