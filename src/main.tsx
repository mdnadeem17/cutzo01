import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <App />
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore registration failures in local development environments.
    });
  });
}
