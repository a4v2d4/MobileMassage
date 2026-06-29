import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SonomaInstagram from "../sonoma";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SonomaInstagram />
  </StrictMode>,
);
