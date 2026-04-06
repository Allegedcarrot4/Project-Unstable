# Unstable — Password-Protected Web Proxy

## Overview

"Unstable" is a password-protected web proxy browser app with a dark void.radio.fm-inspired aesthetic (Space Grotesk font). Built as a pnpm monorepo.

- **Password**: `ripmoonlight`
- **Session key**: `unstable_auth`

## Architecture

### Artifacts
- `artifacts/app` — React + Vite frontend (multi-tab proxy browser UI)
- `artifacts/api-server` — Express API server (bare server, static proxy assets)

### Proxy Stack
- **Proxy engine**: Ultraviolet (UV) — pre-built dist files copied to `artifacts/app/public/`
- **Bare server**: `@nebula-services/bare-server-node` mounted at `/api/bare/`
- **Bare transport module**: `@mercuryworkshop/bare-as-module3` served from `/api/baremod/`
- **Bare-mux transport**: `@mercuryworkshop/bare-mux` (npm dep in React app)
- **Baremux worker**: `artifacts/app/public/baremux/worker.js` (SharedWorker)
- **Service worker**: `/uv.sw.js` (scope `/`)
- **UV prefix**: `/service/`

### Key Files
- `artifacts/app/src/App.tsx` — tab browser UI, password screen, proxy setup
- `artifacts/app/public/uv.config.js` — UV configuration (prefix `/service/`)
- `artifacts/app/index.html` — loads uv.bundle.js and uv.config.js as plain scripts
- `artifacts/api-server/src/app.ts` — bare server, baremod static, CORS
- `artifacts/api-server/src/index.ts` — HTTP server + WebSocket upgrade for bare

### Important Constraints
- Do NOT run npm/pnpm install inside `/home/runner/workspace/scramjet/` or `/home/runner/workspace/Ultraviolet/`
- Never install `@titaniumnetwork-dev/*` packages
- Scramjet is cloned at `/home/runner/workspace/scramjet/` but not yet integrated

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Build**: esbuild (ESM bundle for api-server)

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server (port 8080)
- `pnpm --filter @workspace/app run dev` — run React app (Vite)
