<p align="left">
  <img src="logo.svg" alt="Unstable" height="80">
</p>
<p align="left">
  <a href="https://discord.com/invite/yD9NkcsKcw"><img src="https://skillicons.dev/icons?i=discord" alt="Join our Discord"></a>&nbsp;<a href="https://github.com/Allegedcarrot4/Project-Unstable"><img src="https://skillicons.dev/icons?i=github" alt="View on GitHub"></a>
</p>

**Unstable** is a fast, password-protected, browser-inspired web proxy with a dark void aesthetic. Powered by Ultraviolet, Scramjet, bare-mux, and Wisp.

---

## Features

- Browser-like UI with tabs, favicons, history, and a loading progress bar
- UV + Scramjet dual proxy engines with auto-switching
- 5 bare proxy servers + Wisp WebSocket transport
- libcurl, epoxy, and bare-mux transport options
- Built-in adblock and tracking parameter stripping
- Canvas, WebGL, and WebRTC fingerprint protection
- New tab page with editable shortcuts
- Tab cloaking (Google Drive, Schoology, ClassLink, Google Classroom)
- Recordable keyboard shortcuts
- `unstable://` protocol (newtab, settings, credits, blank)
- Password-protected access
- Dark themes with animated backgrounds

---

## Deployment Options

> **Note**
> Choose a frontend-only service, a backend-only service, or a combined Node service. Frontend-only hosting needs `BACKEND_URL` configured if API and Wisp functionality should connect to a separately hosted backend. Combined hosting starts both processes and proxies backend routes on the same origin.

---

## Platform-Neutral Node Hosting

These commands use Node.js and the existing build scripts; they do not require Docker or a Wasmer-specific config. Install dependencies once, then build only the parts you plan to run:

```bash
pnpm install --frozen-lockfile
```

### Frontend Only

Build and start the frontend. Set `BACKEND_URL` to the reachable backend origin when hosting the API separately. It can be omitted if only the static UI is needed.

```bash
pnpm run build:frontend
PORT=8080 BACKEND_URL=https://api.example.com node scripts/serve-frontend.mjs
```

### Backend Only

```bash
pnpm run build:backend
PORT=3001 node artifacts/api-server/dist/index.mjs
```

### Frontend and Backend Together

The combined launcher waits for the backend to listen, then serves the frontend and proxies API, `/return`, and websocket requests to it.

```bash
pnpm run build:all
PORT=8080 BACKEND_PORT=3001 node scripts/start-all.mjs
```

In each mode, configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SUPABASE_PROJECT_ID` in the build environment if you need to override the built-in Supabase project settings. In the combined mode, `PORT` is the frontend's public listener and `BACKEND_PORT` is the internal API listener. In standalone backend mode, `PORT` is the API listener.

---

## Deployment via Terminal

> **Note**
> Before deploying, install:
>
> - [Git](https://git-scm.com/downloads)
> - [Node.js](https://nodejs.org/en/download/prebuilt-installer)
>
> Then install **pnpm**:
>
> ```bash
> npm install -g pnpm
> ```

### Production: Two Services

Build and deploy the backend from the root `Dockerfile`. It listens on `PORT` (typically `7860`). Build and deploy the frontend from `Dockerfile.frontend`, then set its `BACKEND_URL` to the backend's reachable HTTP origin (for example, `https://unstable-api.example.com`). The frontend service listens on `PORT` (default `7860`) and reverse-proxies API, bare, and Wisp websocket traffic. Supabase URL/key overrides are Docker build arguments because Vite embeds them in the frontend bundle.

For a local container build:

```bash
docker build -t unstable-backend -f Dockerfile .
docker build -t unstable-frontend -f Dockerfile.frontend .
```

Pass `--build-arg VITE_SUPABASE_URL=...` and `--build-arg VITE_SUPABASE_ANON_KEY=...` to the frontend build when overriding the built-in Supabase project.

When running the frontend container, set `BACKEND_URL` to the backend service URL.

### Backend-Only Local Run

See [Platform-Neutral Node Hosting](#platform-neutral-node-hosting) for the backend-only build and start commands. `pnpm start` remains an alias for the backend entrypoint.

### Development

```bash
pnpm install
copy .env.example .env
```

Edit the root `.env` only. Do not create package-level `.env` files in `artifacts/app` or `artifacts/api-server`; Vite and the API server both read from the repo root.

Start the full local stack:

```bash
pnpm dev
```

Or run the pieces manually. In one terminal, start the frontend:

```bash
pnpm --filter @workspace/app dev
```

In another terminal, start the API server:

```bash
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

If `PASSWORD` is set in the env, visitors must enter it on the login screen. If `PASSWORD` is unset, no login screen is shown.

---

## Secrets to Configure

Set these in your deployment platform's environment/secrets panel:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | **Yes** | Public listener port. In combined hosting this is the frontend; in backend-only hosting it is the API. |
| `BACKEND_PORT` | Combined hosting | Internal API listener port; defaults to `3001`. |
| `BACKEND_URL` | Frontend-only hosting | Reachable HTTP origin of a separately hosted backend. Combined hosting configures its local backend automatically. |
| `PASSWORD` | No | Optional password users must enter to access Unstable. If unset, no password screen is shown. |
| `SESSION_SECRET` | No | Optional but recommended for production session hardening. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Required for server-side auth features. |
| `VITE_SUPABASE_URL` | Frontend build arg | Supabase project URL. Falls back to built-in default. |
| `VITE_SUPABASE_ANON_KEY` | Frontend build arg | Supabase anon key. Falls back to built-in default. |

---

## Contributing

Interested in contributing? Open a [pull request](https://github.com/Allegedcarrot4/Project-Unstable/pulls) or file a [GitHub Issue](https://github.com/Allegedcarrot4/Project-Unstable/issues).

---

## Support

Need help or ran into an issue?

- Open a [GitHub Issue](https://github.com/Allegedcarrot4/Project-Unstable/issues)
- Ask for help in our [Discord server](https://discord.com/invite/yD9NkcsKcw)

---

## Credits

Huge thanks to everyone who has contributed to Unstable.

<p>
  <a href="https://github.com/Allegedcarrot4/Project-Unstable/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Allegedcarrot4/Project-Unstable" alt="Contributors">
  </a>
</p>
