import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { LanguageProvider } from "./context/LanguageContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("✅ SW registered:", reg.scope))
      .catch((err) => console.log("SW registration failed:", err));
  });
}