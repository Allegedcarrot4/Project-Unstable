---
title: Unstable
emoji: 🌑
colorFrom: gray
colorTo: gray
sdk: docker
pinned: false
---

# Unstable

A password-protected web proxy browser with a dark void aesthetic. Powered by [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet), [Scramjet](https://github.com/MercuryWorkshop/scramjet), bare-mux, and Wisp.

## Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Allegedcarrot4/Project-Unstable)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/new?template=https://github.com/Allegedcarrot4/Project-Unstable)
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/services/deploy?type=git&repository=github.com/Allegedcarrot4/Project-Unstable&builder=dockerfile&instance_type=free&ports=7860;http;/&env[PORT]=7860)

> All three platforms have free tiers and support the full stack (Node server + WebSocket proxy). Set your `PASSWORD` secret before deploying.

## Features

- Multi-tab browser with favicons, history, and loading progress bar
- UV + Scramjet dual proxy engines (auto-switching)
- 5 bare proxy servers + Wisp WebSocket transport
- libcurl, epoxy, and bare-mux transport options
- Built-in adblock and tracking parameter stripping
- Canvas/WebGL/WebRTC fingerprint protection
- New tab page with editable shortcuts
- Tab cloaking (Google Drive, Schoology, ClassLink, Google Classroom)
- Recordable keyboard shortcuts
- `unstable://` protocol (newtab, settings, credits, blank)
- Password-protected access
- Dark theme with animated Vanta backgrounds

## Secrets to Configure

Set these in your deployment platform's environment/secrets panel:

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSWORD` | **Yes** | Password users must enter to access Unstable. The server refuses all logins if unset in production. |
| `VITE_SUPABASE_URL` | No | Supabase project URL for accounts. Falls back to built-in default. |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key. Falls back to built-in default. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Required for server-side auth features (ban management, device registration). |

Copy `.env.example` to `.env` for local development. Never commit `.env`.

## Platform Notes

### Render
Connect your GitHub repo, select **Docker** as the environment, and add your `PASSWORD` secret. Render's free tier sleeps after 15 minutes of inactivity but wakes automatically on the next request.

### Railway
Connect your GitHub repo and Railway auto-detects the Dockerfile. Add `PASSWORD` in the Variables tab. The free tier gives $5 credit/month.

### Koyeb
Use the deploy button above or connect your repo manually. Select the **free nano instance**, set `PORT=7860` and `PASSWORD` in the environment variables section.

### Hugging Face Spaces
The repo is already configured for HF Spaces via the front-matter above. Set `PASSWORD` in **Settings → Variables and secrets**.

### Stormkit
Stormkit cloud is static hosting only and cannot run the Node.js server — the proxy will not work there. Use one of the platforms above instead.

## Local Development

This repo is a pnpm monorepo.

```bash
pnpm install

# Terminal 1 — frontend dev server
pnpm --filter @workspace/app dev

# Terminal 2 — API server
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

For development mode on Windows PowerShell:
```powershell
$env:NODE_ENV='development'; pnpm --filter @workspace/api-server start
```

The dev password (when `PASSWORD` is unset) is `ripmoonlight`.

## Architecture

```
Browser
├── UV service worker (/service/*) → bare servers (/api/cdn/ … /api/cdn5/)
└── Scramjet service worker (/ham/*) → Wisp WebSocket (/api/wisp/)

Server (Fastify, clustered across all CPU cores)
├── 5 × bare-server-node instances (HTTP transport)
├── wisp-js (WebSocket/TCP transport)
└── Static frontend with pre-compressed .br/.gz assets
```

## Tech Stack

- **Frontend** — React 19, Framer Motion, Tailwind CSS v4, Vite 7
- **Proxy** — Ultraviolet, Scramjet, bare-mux, libcurl-transport, epoxy-transport
- **Server** — Fastify v5, Node.js cluster, wisp-js, bare-server-node
- **Auth** — Supabase

## Contributors

<a href="https://github.com/Allegedcarrot4/Project-Unstable/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Allegedcarrot4/Project-Unstable" />
</a>
