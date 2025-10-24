import { CardPlaceholder } from "@/components/CardPlaceholder";
import { NavMenu } from "@/components/NavMenu/NavMenu";
import { Subscribe } from "@react-rxjs/core";
import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ValidatorDetailPage } from "./ValidatorDetail";

const ValidatorList = lazy(() => import("./ValidatorList"));

export const Validators = () => {
  return (
    <div className="space-y-4">
      <NavMenu />
      <Subscribe fallback={<ValidatorsSkeleton />}>
        <Routes>
          <Route path=":address" Component={ValidatorDetailPage} />
          <Route path="*" element={<ValidatorList />} />
        </Routes>
      </Subscribe>
    </div>
  );
};

export const ValidatorsSkeleton = () => (
  <div className="space-y-4">
    <CardPlaceholder height={100} />
    <CardPlaceholder height={400} />
  </div>
);
