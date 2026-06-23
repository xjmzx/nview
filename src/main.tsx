import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SignerProvider } from "./hooks/useSigner.tsx";
import { ReactionsProvider } from "./hooks/useReactions.tsx";
import { RelaysProvider } from "./hooks/useRelays.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RelaysProvider>
      <SignerProvider>
        <ReactionsProvider>
          <App />
        </ReactionsProvider>
      </SignerProvider>
    </RelaysProvider>
  </StrictMode>,
);
