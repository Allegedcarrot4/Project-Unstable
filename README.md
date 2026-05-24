---
title: Unstable
emoji: 🌑
colorFrom: gray
colorTo: gray
sdk: docker
pinned: false
---

# Unstable

A password-protected web proxy browser with a dark void aesthetic. Powered by [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet), bare-mux, and bare-server-node.

## Features

- Multi-tab browser with favicons and history
- 5 bare proxy servers + optional Wisp protocol
- New tab page with editable shortcuts
- Tab cloaking (Google Drive, Schoology, ClassLink, Google Classroom)
- Recordable keyboard shortcuts
- `unstable://` protocol (newtab, settings, credits, blank)
- Password-protected access

## Deployment — Secrets to Configure

Go to **Settings → Variables and secrets** in your Space and add:

| Secret name | Required | Description |
|-------------|----------|-------------|
| `PASSWORD` | **Yes** | The password users must enter to access Unstable. If not set, the Space will refuse all login attempts in production. |
| `SESSION_SECRET` | No | An optional random string for future session signing. Recommended for hardening. |

Copy `.env.example` to `.env` and fill in your own values for local development. `.env` files are ignored by git and should never be committed.

## Deployment — Stormkit

When deploying with Stormkit, do not use the root workspace build script `pnpm run build` because it builds the entire monorepo.

Use the app-only build command instead:

```bash
pnpm run build:app:stormkit
```

And set Stormkit's output directory to:

```text
artifacts/app/dist
```

This forces Stormkit to build only `@workspace/app` and then deploy only the actual frontend bundle.

> **Security note:** Because the password is validated server-side against the `PASSWORD` secret, it is never exposed in the client bundle or source code. The Space can be public without leaking access credentials.

## Local Development

This repo is a pnpm monorepo. The two dev servers are:

- `artifacts/api-server` — Express + bare-server proxy
- `artifacts/app` — Vite dev server

When `PASSWORD` is not set, the server returns a `503 {dev:true}` response and the frontend falls back to the local development password (`ripmoonlight`).

## Wisp Protocol (optional)

To enable the Wisp transport alongside the 5 bare servers:

```bash
pnpm --filter @workspace/api-server add wisp-server-node
```

Restart the API server — the Wisp endpoint activates automatically at `/api/wisp`.

### Commands

```bash
pnpm install
pnpm --filter @workspace/app dev
```

In another terminal:

```bash
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

If you want development behavior (`NODE_ENV=development`):

- macOS/Linux: `NODE_ENV=development pnpm --filter @workspace/api-server start`
- Windows PowerShell: `$env:NODE_ENV='development'; pnpm --filter @workspace/api-server start`


