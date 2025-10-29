import { Navigate, Route, Routes } from "react-router-dom";
import { distinctUntilChanged, map, merge, Observable, switchMap } from "rxjs";
import { Header } from "./components/Header/Header";
import { Dashboard, dashboardSub$ } from "./pages/Dashboard";
import { Nominate } from "./pages/Nominate";
import { nominateSub$ } from "./pages/Nominate/Nominate";
import { NotFound } from "./pages/NotFound";
import { Pools, poolsSub$ } from "./pages/Pools";
import { Validators, validatorsSub$ } from "./pages/Validators";
import { location$ } from "./router";
import { selectedSignerAccount$ } from "./state/account";
import { empyricalStakingBlockDuration$ } from "./state/era";

function App() {
  return (
    <div className="w-full h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 overflow-auto" id="app-content">
        <div className="container m-auto">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nominate" element={<Nominate />} />
            <Route path="/pools/*" element={<Pools />} />
            <Route path="/validators/*" element={<Validators />} />
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

const pathRegex = /^\/[^/]*\/([^/]*)\/?/;
const subs$: Record<string, Observable<unknown>> = {
  dashboard: dashboardSub$,
  nominate: nominateSub$,
  pools: poolsSub$,
  validators: validatorsSub$,
};
const routeSub$ = location$.pipe(
  map((v) => {
    const pathRes = pathRegex.exec(v.pathname);
    if (!pathRes) {
      console.error("path not found", v.pathname);
      return null;
    }
    return pathRes[1];
  }),
  distinctUntilChanged(),
  switchMap((v) => (v ? subs$[v] : null) ?? [])
);
export const appSub$ = merge(
  routeSub$,
  selectedSignerAccount$,
  empyricalStakingBlockDuration$
);

export default App;
