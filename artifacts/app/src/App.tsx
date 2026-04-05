import { useState, useEffect } from "react";
import { Router as WouterRouter, Switch, Route } from "wouter";

const CORRECT_PASSWORD = "ripmoonlight";
const SESSION_KEY = "app_auth";

function PasswordScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      onSuccess();
    } else {
      setError(true);
      setShaking(true);
      setPassword("");
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(0, 0%, 5%)",
        fontFamily: "'Space Grotesk', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(hsl(0,0%,100%,0.02) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2.5rem",
          width: "100%",
          maxWidth: "360px",
          padding: "0 1.5rem",
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "2px",
              height: "32px",
              background: "hsl(0,0%,60%)",
              margin: "0 auto 1.5rem",
            }}
          />
          <h1
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "hsl(0,0%,55%)",
              margin: 0,
            }}
          >
            restricted access
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div
            style={{
              animation: shaking ? "shake 0.5s ease-in-out" : "none",
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="enter password"
              autoFocus
              style={{
                width: "100%",
                background: "hsl(0,0%,8%)",
                border: `1px solid ${error ? "hsl(0,62%,45%)" : "hsl(0,0%,16%)"}`,
                color: "hsl(0,0%,90%)",
                padding: "0.875rem 1rem",
                fontSize: "0.9rem",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.05em",
                outline: "none",
                borderRadius: "2px",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                if (!error) e.target.style.borderColor = "hsl(0,0%,35%)";
              }}
              onBlur={(e) => {
                if (!error) e.target.style.borderColor = "hsl(0,0%,16%)";
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "hsl(0,62%,55%)",
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                margin: 0,
                textAlign: "center",
              }}
            >
              incorrect password
            </p>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              background: "hsl(0,0%,90%)",
              color: "hsl(0,0%,5%)",
              border: "none",
              padding: "0.875rem 1rem",
              fontSize: "0.72rem",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: "2px",
              transition: "background 0.15s",
              marginTop: "0.25rem",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "hsl(0,0%,75%)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "hsl(0,0%,90%)";
            }}
          >
            enter
          </button>
        </form>

        <div
          style={{
            width: "2px",
            height: "32px",
            background: "hsl(0,0%,60%)",
            margin: "0 auto",
          }}
        />
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        input::placeholder {
          color: hsl(0,0%,35%);
        }
      `}</style>
    </div>
  );
}

function MainApp() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "hsl(0,0%,5%)",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "hsl(0,0%,90%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", color: "hsl(0,0%,40%)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
        content coming soon
      </div>
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });

  if (!authenticated) {
    return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={MainApp} />
      </Switch>
    </WouterRouter>
  );
}
