import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// Initialize error tracking
import { initSentry } from "@/lib/sentry";
initSentry();

// Initialize analytics
import { initPostHog } from "@/lib/posthog";
initPostHog();

// Initialize web vitals monitoring
import { initWebVitals } from "@/lib/web-vitals";
initWebVitals();

// Register PWA service worker
if ("serviceWorker" in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show a prompt to user about new content being available
      if (confirm("New content is available. Reload to update?")) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log("[PWA] App ready to work offline");
    },
    onRegistered(registration) {
      console.log("[PWA] Service worker registered:", registration);
    },
    onRegisterError(error) {
      console.error("[PWA] Service worker registration error:", error);
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
