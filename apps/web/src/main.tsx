import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style/global.css";
import { AppRouter } from "./router";
import { Providers } from "./providers";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>
);
