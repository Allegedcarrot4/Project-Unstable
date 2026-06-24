---
title: Unstable
emoji: 🌑
colorFrom: gray
colorTo: gray
sdk: docker
pinned: false
---

<p align="left">
  <img src="https://raw.githubusercontent.com/Allegedcarrot4/Project-Unstable/main/logo.svg" alt="Unstable" height="80">
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
- Dark themes with animated Vanta backgrounds

---

## Deployment Options

> **Note**
> Unstable **cannot** be deployed to Netlify, Vercel, GitHub Pages, Stormkit, or any other static hosting platform. It requires a full Node.js server for the proxy to function.

<p>
  <a href="https://render.com/deploy?repo=https://github.com/Allegedcarrot4/Project-Unstable"><img src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/main/buttons/remade/render.svg" alt="Deploy to Render"></a>&nbsp;
  <a href="https://railway.com/template/new?template=https://github.com/Allegedcarrot4/Project-Unstable"><img src="https://raw.githubusercontent.com/BinBashBanana/deploy-buttons/main/buttons/remade/railway.svg" alt="Deploy on Railway"></a>&nbsp;
  <a href="https://app.koyeb.com/services/deploy?type=git&repository=github.com/Allegedcarrot4/Project-Unstable&builder=dockerfile&instance_type=free&ports=7860%3Bhttp%3B%2F&env[PORT]=7860"><img src="https://binbashbanana.github.io/deploy-buttons/buttons/remade/koyeb.svg" alt="Deploy to Koyeb"></a>
</p>

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

### Production

1. Clone the repository:

```bash
git clone https://github.com/Allegedcarrot4/Project-Unstable
cd Project-Unstable
```

2. Install dependencies and start the server:

```bash
pnpm install
pnpm run build
pnpm start
```

### Development

```bash
pnpm install
```

In one terminal, start the frontend:

```bash
pnpm --filter @workspace/app dev
```

In another terminal, start the API server:

```bash
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

The dev password (when `PASSWORD` is unset) is `ripmoonlight`.

---

## Secrets to Configure

Set these in your deployment platform's environment/secrets panel:

| Variable | Required | Description |
|----------|----------|-------------|
| `PASSWORD` | **Yes** | Password users must enter to access Unstable. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Required for server-side auth features. |
| `VITE_SUPABASE_URL` | No | Supabase project URL. Falls back to built-in default. |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key. Falls back to built-in default. |

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
