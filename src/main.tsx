import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { MemoryProvider } from "./context/MemoryContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <MemoryProvider>
        <App />
      </MemoryProvider>
    </AuthProvider>
  </StrictMode>
);

