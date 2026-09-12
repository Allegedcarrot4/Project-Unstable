import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorProvider } from "./lib/errorContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import "./index.css";

function RootApp() {
  return (
    <ErrorProvider>
      <ErrorBoundary
        fallback={
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0d0d0d',
            color: '#e0e0e0',
            fontFamily: "'Space Grotesk', sans-serif",
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h1 style={{ margin: '0 0 1rem', fontSize: '1.5rem' }}>Something went wrong</h1>
            <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.6)' }}>
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#e8e8e8',
                color: '#0d0d0d',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        }
      >
        <PasswordGate>
          <App />
        </PasswordGate>
      </ErrorBoundary>
    </ErrorProvider>
  );
}

createRoot(document.getElementById("root")!).render(<RootApp />);
