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

> **Security note:** Because the password is validated server-side against the `PASSWORD` secret, it is never exposed in the client bundle or source code. The Space can be public without leaking access credentials.

## Local Development (Replit)

The app runs on Replit as a pnpm monorepo. Two workflows handle the dev servers:

- `artifacts/api-server` — Express + bare-server proxy (port assigned by Replit)
- `artifacts/app` — Vite dev server (port assigned by Replit)

When `PASSWORD` is not set, the server returns a `503 {dev:true}` response and the frontend falls back to the local development password (`ripmoonlight`).

## Wisp Protocol (optional)

To enable the Wisp transport alongside the 5 bare servers:

```bash
pnpm --filter @workspace/api-server add wisp-server-node
```

Restart the API server — the Wisp endpoint activates automatically at `/api/wisp`.
