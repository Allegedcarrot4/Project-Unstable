# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest-10 --activate

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy the full monorepo source (node_modules are excluded via .dockerignore)
COPY . .

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build the React frontend
# BASE_PATH=/ because in Docker there is no path prefix
RUN BASE_PATH=/ PORT=7860 NODE_ENV=production \
    pnpm --filter @workspace/app run build

# Build the Express API server
RUN pnpm --filter @workspace/api-server run build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# API server compiled bundle
COPY --from=builder /app/artifacts/api-server/dist          ./dist

# Runtime workspace package metadata for pnpm
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc ./

# Workspace package sources required by runtime dependencies
COPY --from=builder /app/lib/db ./lib/db
COPY --from=builder /app/lib/api-zod ./lib/api-zod

# Install runtime dependencies inside the final image
RUN pnpm install --frozen-lockfile --prod --filter @workspace/api-server

# Vite-built frontend + UV/service-worker public files
# Vite copies artifacts/app/public/** into the output during build
COPY --from=builder /app/artifacts/app/dist/public          ./app/dist/public

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

# PASSWORD must be set as a Space secret — the app will refuse auth without it
# SESSION_SECRET is optional but recommended for production hardening

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
