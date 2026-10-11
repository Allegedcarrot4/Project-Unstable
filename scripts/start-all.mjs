import { access } from "node:fs/promises";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const backendEntry = resolve(repoRoot, "artifacts/api-server/dist/index.mjs");
const frontendEntry = resolve(repoRoot, "scripts/serve-frontend.mjs");
const backendPort = Number(process.env.BACKEND_PORT || "3001");
const frontendPort = Number(process.env.PORT || "8080");
const children = [];
let shuttingDown = false;

function validatePort(port, name) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
}

function stop(signal, exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (exitCode !== undefined) process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) child.kill(signal);
  }

  const forceStop = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null) child.kill("SIGKILL");
    }
  }, 5000);
  forceStop.unref();
}

function watchChild(child, name) {
  children.push(child);
  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error);
    stop("SIGTERM", 1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`${name} exited unexpectedly (code=${code}, signal=${signal})`);
    stop("SIGTERM", code ?? 1);
  });
}

function waitForPort(port, child, timeoutMs = 30000) {
  return new Promise((resolveReady, reject) => {
    const deadline = Date.now() + timeoutMs;
    let retryTimer;

    function check() {
      if (child.exitCode !== null) {
        reject(new Error("Backend exited before it started listening"));
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error(`Backend did not listen on port ${port} within ${timeoutMs}ms`));
        return;
      }

      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolveReady();
      });
      socket.once("error", () => {
        socket.destroy();
        retryTimer = setTimeout(check, 100);
      });
    }

    check();
    child.once("exit", () => {
      if (retryTimer) clearTimeout(retryTimer);
      reject(new Error("Backend exited before it started listening"));
    });
  });
}

validatePort(backendPort, "BACKEND_PORT");
validatePort(frontendPort, "PORT");
if (backendPort === frontendPort) {
  throw new Error("PORT and BACKEND_PORT must be different for combined hosting");
}

await Promise.all([access(backendEntry), access(frontendEntry)]).catch(() => {
  throw new Error("Build the frontend and backend first with: pnpm run build:all");
});

const backend = spawn(process.execPath, [backendEntry], {
  cwd: repoRoot,
  env: { ...process.env, PORT: String(backendPort) },
  stdio: "inherit",
});
watchChild(backend, "Backend");

process.on("SIGINT", () => stop("SIGINT", 130));
process.on("SIGTERM", () => stop("SIGTERM", 143));

try {
  await waitForPort(backendPort, backend);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop("SIGTERM", 1);
  throw error;
}

const frontend = spawn(process.execPath, [frontendEntry], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(frontendPort),
    BACKEND_URL: `http://127.0.0.1:${backendPort}`,
  },
  stdio: "inherit",
});
watchChild(frontend, "Frontend");