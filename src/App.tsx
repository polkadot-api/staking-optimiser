import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header/Header";
import { Dashboard } from "./pages/Dashboard";
import { Nominate } from "./pages/Nominate";
import { NotFound } from "./pages/NotFound";
import { Pools } from "./pages/Pools";
import { Validators } from "./pages/Validators";

function App() {
  return (
    <div className="w-full h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 overflow-auto">
        <div className="container m-auto">
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="/nominate" element={<Nominate />} />
            <Route path="/pools" element={<Pools />} />
            <Route path="/validators" element={<Validators />} />
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
