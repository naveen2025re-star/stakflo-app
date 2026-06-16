import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@cloudscape-design/global-styles/index.css";
import { applyMode, applyDensity, Mode, Density } from "@cloudscape-design/global-styles";

const savedTheme = localStorage.getItem("stakflo-theme");
if (savedTheme === "dark") {
  applyMode(Mode.Dark);
}

const savedDensity = localStorage.getItem("stakflo-density");
if (savedDensity === "compact") {
  applyDensity(Density.Compact);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
