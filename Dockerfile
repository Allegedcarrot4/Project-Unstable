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

# Copy the actual bare-as-module3 package from pnpm's store into a dedicated runtime node_modules tree
RUN mkdir -p /app/runtime_node_modules/@mercuryworkshop && \
    pkg=$(find /app/node_modules/.pnpm -path '*/@mercuryworkshop/bare-as-module3' -type d | head -n 1) && \
    cp -a "$pkg" /app/runtime_node_modules/@mercuryworkshop/bare-as-module3

# Build the React frontend
# BASE_PATH=/ because in Docker there is no path prefix
RUN BASE_PATH=/ PORT=7860 NODE_ENV=production \
    pnpm --filter @workspace/app run build

# Build the Express API server
RUN pnpm --filter @workspace/api-server run build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# API server compiled bundle
COPY --from=builder /app/artifacts/api-server/dist          ./dist

# Runtime package metadata required by runtime libraries like bare-server-node
COPY --from=builder /app/artifacts/api-server/package.json  ./package.json

# Runtime node_modules for the API server
# Copy the extracted bare-as-module3 package into the runtime root node_modules
COPY --from=builder /app/runtime_node_modules  ./node_modules

# Vite-built frontend + UV/service-worker public files
# Vite copies artifacts/app/public/** into the output during build
COPY --from=builder /app/artifacts/app/dist/public          ./public

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

# PASSWORD must be set as a Space secret — the app will refuse auth without it
# SESSION_SECRET is optional but recommended for production hardening

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
