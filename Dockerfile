# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest-10 --activate

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy the full monorepo source (node_modules are excluded via .dockerignore)
COPY . .

# Install all workspace dependencies (delete broken lockfile first — bare-mux tarball integrity missing)
RUN rm -f pnpm-lock.yaml && pnpm install

# Extract runtime packages from the pnpm store so they can be copied into the runner
RUN mkdir -p /app/runtime_node_modules/@mercuryworkshop && \
    pkg=$(find /app/node_modules/.pnpm -path '*/@mercuryworkshop/bare-as-module3' -type d | head -n 1) && \
    cp -aL "$pkg" /app/runtime_node_modules/@mercuryworkshop/bare-as-module3 && \
    wspkg=$(find /app/node_modules/.pnpm -path '*/node_modules/ws' -type d | head -n 1) && \
    cp -aL "$wspkg" /app/runtime_node_modules/ws

# Build the React frontend
# BASE_PATH=/ because in Docker there is no path prefix
RUN BASE_PATH=/ PORT=7860 NODE_ENV=production \
    pnpm --filter @workspace/app run build

# Build the Express API server
RUN pnpm --filter @workspace/api-server run build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
RUN apt-get update -qq && apt-get install -y -qq tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# API server compiled bundle (matches pnpm start's CWD expectations)
COPY --from=builder /app/artifacts/api-server/dist          ./artifacts/api-server/dist

# Runtime workspace package metadata for pnpm
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc ./

# Workspace package sources required by runtime dependencies
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/lib/api-zod ./lib/api-zod
COPY --from=builder /app/artifacts/api-server ./artifacts/api-server

# Install runtime dependencies inside the final image
RUN rm -f pnpm-lock.yaml && pnpm install --prod --filter @workspace/api-server

# Ensure bare-as-module3 is available at runtime even if pnpm install misses it
COPY --from=builder /app/runtime_node_modules ./node_modules

# Vite-built frontend + UV/service-worker public files
# Vite copies artifacts/app/public/** into the output during build
COPY --from=builder /app/artifacts/app/dist/public          ./artifacts/app/dist/public

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

# PASSWORD must be set as a Space secret — the app will refuse auth without it
# SESSION_SECRET is optional but recommended for production hardening

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
