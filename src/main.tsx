import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";

CapacitorApp.addListener("appStateChange", ({ isActive }) => {
  console.log("App is active:", isActive);
});

createRoot(document.getElementById("root")!).render(<App />);
