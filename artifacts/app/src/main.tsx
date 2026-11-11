import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorProvider } from "./lib/errorContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import PasswordGate from "./components/PasswordGate";
import "./index.css";

// Respond to baremux SharedWorker "getPort" requests.
//
// The bare-mux requester (running inside a service worker) resolves its
// promise with *whatever data* arrives on the port it sent us, then calls
// `MessagePort.prototype.postMessage` on that value. We therefore MUST
// transfer back a real bare-mux SharedWorker MessagePort — replying with a
// plain object like `{ type: "port" }` throws `TypeError: Illegal invocation`,
// every client rejects, and the SW fails with
// "All clients returned an invalid MessagePort".
const BAREMUX_WORKER_PATH = "/baremux/worker.js";
const BAREMUX_WORKER_NAME = "bare-mux-worker";

function respondWithBareMuxPort(port: MessagePort) {
  try {
    const worker = new SharedWorker(BAREMUX_WORKER_PATH, BAREMUX_WORKER_NAME);
    port.postMessage(worker.port, [worker.port]);
    console.debug("bare-mux: responded to getPort with SharedWorker port");
  } catch (err) {
    console.warn("bare-mux: failed to provide SharedWorker port", err);
  }
}

if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "getPort") return;
    const port = event.ports?.[0] ?? event.data?.port;
    if (port) respondWithBareMuxPort(port);
  });
}

// Fallback for direct window messages from baremux
window.addEventListener("message", (event) => {
  if (event.data?.type !== "getPort") return;
  const port = event.ports?.[0] ?? event.data?.port;
  if (port) respondWithBareMuxPort(port);
});

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
