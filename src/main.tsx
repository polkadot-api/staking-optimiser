import { PolkaHubProvider } from "polkahub"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Navigate, Route, Routes } from "react-router-dom"
import App, { appSub$ } from "./App.tsx"
import { Transactions } from "./components/Transactions.tsx"
import "./index.css"
import { Router } from "./router.tsx"
import { polkaHub } from "./state/polkahub.ts"
import { codeSplit } from "./util/codeSplit.tsx"

const LazyVaultModal = codeSplit(
  import("polkahub").then(({ VaultTxModal }) => ({ VaultTxModal })),
  () => null,
  ({ payload: { VaultTxModal } }) => <VaultTxModal />,
)

appSub$.subscribe()
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PolkaHubProvider polkaHub={polkaHub}>
      <Router>
        <Routes>
          <Route path="/:chain/*" element={<App />} />
          <Route path="/" element={<Navigate to="/polkadot" replace />} />
        </Routes>
        <LazyVaultModal />
        <Transactions />
      </Router>
    </PolkaHubProvider>
  </StrictMode>,
)
