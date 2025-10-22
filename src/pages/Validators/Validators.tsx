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
      <Subscribe fallback="Loading…">
        <Routes>
          <Route path=":address" Component={ValidatorDetailPage} />
          <Route path="*" element={<ValidatorList />} />
        </Routes>
      </Subscribe>
    </div>
  );
};
