# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml ./

# Install all deps (including devDeps for tsc)
RUN pnpm install --frozen-lockfile

# Copy source needed by the API TypeScript build
COPY tsconfig.api.json ./
COPY src ./src

# Compile
RUN pnpm api:build

# Prune dev deps
RUN pnpm prune --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Non-root user
RUN addgroup -S sikesra && adduser -S sikesra -G sikesra

# Copy compiled output and prod node_modules
COPY --from=builder /app/dist/api ./dist/api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER sikesra

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/api/index.js"]
