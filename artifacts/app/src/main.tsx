import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorProvider } from "./lib/errorContext";
import "./index.css";

function RootApp() {
  return (
    <ErrorProvider>
      <App />
    </ErrorProvider>
  );
}

createRoot(document.getElementById("root")!).render(<RootApp />);
