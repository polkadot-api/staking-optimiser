import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { useLocationSubscription } from "./state/location.ts";
import { Transactions } from "./components/Transactions.tsx";

const LocationListener = () => {
  useLocationSubscription();
  return null;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:chain/*" element={<App />} />
        <Route path="/" element={<Navigate to="/polkadot" replace />} />
      </Routes>
      <LocationListener />
      <Transactions />
    </BrowserRouter>
  </StrictMode>
);
