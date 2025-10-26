import { PolkaHubProvider } from "polkahub";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, Route, Routes } from "react-router-dom";
import App, { appSub$ } from "./App.tsx";
import { readOnlyProvider } from "./components/Header/ManageAddresses.tsx";
import { ledgerAccountProvider } from "./components/LedgerAccounts.tsx";
import { Transactions } from "./components/Transactions.tsx";
import { VaultTxModal } from "./components/vault/index.ts";
import "./index.css";
import { Router } from "./router.tsx";
import { pjsWalletProvider, selectedAccountPlugin } from "./state/account.ts";
import { polkadotVaultProvider } from "./state/vault.ts";

const plugins = [
  selectedAccountPlugin,
  pjsWalletProvider,
  polkadotVaultProvider,
  ledgerAccountProvider,
  readOnlyProvider,
];

appSub$.subscribe();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PolkaHubProvider plugins={plugins}>
      <Router>
        <Routes>
          <Route path="/:chain/*" element={<App />} />
          <Route path="/" element={<Navigate to="/polkadot" replace />} />
        </Routes>
        <VaultTxModal />
        <Transactions />
      </Router>
    </PolkaHubProvider>
  </StrictMode>
);
