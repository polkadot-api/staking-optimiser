import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, Route, Routes } from "react-router-dom";
import App, { appSub$ } from "./App.tsx";
import { Transactions } from "./components/Transactions.tsx";
import { VaultTxModal } from "./components/vault/index.ts";
import "./index.css";
import { Router } from "./router.tsx";

appSub$.subscribe();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/:chain/*" element={<App />} />
        <Route path="/" element={<Navigate to="/polkadot" replace />} />
      </Routes>
      <VaultTxModal />
      <Transactions />
    </Router>
  </StrictMode>
);
