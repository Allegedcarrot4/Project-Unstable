import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const staticRoot = resolve(fileURLToPath(new URL("../artifacts/app/dist/public", import.meta.url)));
const backendUrl = new URL(process.env.BACKEND_URL || "https://unstable.bonto.run");
const port = Number(process.env.PORT || "8080");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".dat": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

if (backendUrl && !["http:", "https:"].includes(backendUrl.protocol)) {
  throw new Error("BACKEND_URL must use http:// or https://");
}

function isBackendPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/") || pathname === "/return";
}

function sendBackendUnavailable(response) {
  response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
  response.end("BACKEND_URL is not configured");
}

function forwardedHeaders(request, target) {
  const host = request.headers.host ?? target.host;
  const forwardedFor = request.headers["x-forwarded-for"];
  return {
    ...request.headers,
    host,
    "x-forwarded-host": host,
    "x-forwarded-proto": request.headers["x-forwarded-proto"] ?? (request.socket.encrypted ? "https" : "http"),
    "x-forwarded-for": [forwardedFor, request.socket.remoteAddress].filter(Boolean).join(", "),
  };
}

function proxyHttpRequest(request, response) {
  if (!backendUrl) {
    sendBackendUnavailable(response);
    return;
  }

  const target = new URL(request.url, backendUrl);
  const transport = target.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = transport(target, {
    method: request.method,
    headers: forwardedHeaders(request, target),
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });

  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end("Backend request failed");
  });
  request.pipe(upstream);
}

async function serveStaticFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  let filePath = resolve(staticRoot, `.${decodedPath}`);
  if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${sep}`)) {
    response.writeHead(400).end();
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (fileInfo.isDirectory()) filePath = resolve(filePath, "index.html");
  } catch {
    if (extname(decodedPath)) {
      response.writeHead(404).end();
      return;
    }
    filePath = resolve(staticRoot, "index.html");
  }

  try {
    const fileInfo = await stat(filePath);
    response.writeHead(200, {
      "content-length": fileInfo.size,
      "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; media-src 'self' blob: data:; connect-src 'self' wss: ws: https:; frame-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self';",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-frame-options": "SAMEORIGIN",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, "http://localhost").pathname;
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (isBackendPath(pathname)) {
    proxyHttpRequest(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" }).end();
    return;
  }

  void serveStaticFile(request, response, pathname);
});

server.on("upgrade", (request, clientSocket, clientHead) => {
  let pathname;
  try {
    pathname = new URL(request.url, "http://localhost").pathname;
  } catch {
    clientSocket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    return;
  }

  if (!isBackendPath(pathname) || !backendUrl) {
    clientSocket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n");
    return;
  }

  const target = new URL(request.url, backendUrl);
  const transport = target.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = transport(target, {
    method: request.method,
    headers: { ...forwardedHeaders(request, target), connection: "Upgrade" },
  });

  upstream.on("upgrade", (response, upstreamSocket, upstreamHead) => {
    clientSocket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`);
    for (let index = 0; index < response.rawHeaders.length; index += 2) {
      clientSocket.write(`${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}\r\n`);
    }
    clientSocket.write("\r\n");
    if (upstreamHead.length) clientSocket.write(upstreamHead);
    if (clientHead.length) upstreamSocket.write(clientHead);
    clientSocket.pipe(upstreamSocket);
    upstreamSocket.pipe(clientSocket);
    clientSocket.on("error", () => upstreamSocket.destroy());
    upstreamSocket.on("error", () => clientSocket.destroy());
  });

  upstream.on("response", (response) => {
    clientSocket.end(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n\r\n`);
  });
  upstream.on("error", () => clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n"));
  upstream.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on port ${port}`);
});
