import { CardPlaceholder } from "@/components/CardPlaceholder";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { location$ } from "@/router";
import { lazy, Suspense } from "react";
import { matchPath, Route, Routes } from "react-router-dom";
import { map, merge, switchMap } from "rxjs";
import {
  ValidatorDetailPage,
  validatorDetailPageSub$,
} from "./ValidatorDetail";
import { validatorList$ } from "./ValidatorList";

const ValidatorList = lazy(() => import("./ValidatorList"));

export const Validators = () => {
  return (
    <div className="space-y-4">
      <NavMenu />
      <Suspense fallback={<ValidatorsSkeleton />}>
        <Routes>
          <Route path=":address" Component={ValidatorDetailPage} />
          <Route path="*" element={<ValidatorList />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const routedDetail$ = location$.pipe(
  map(
    (location) =>
      matchPath("/:chainId/validators/:address", location.pathname)?.params
        .address
  ),
  switchMap((id) => (id ? validatorDetailPageSub$(id) : []))
);
export const validatorsSub$ = merge(validatorList$, routedDetail$);

export const ValidatorsSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={170} />
    <CardPlaceholder height={500} />
  </div>
);
