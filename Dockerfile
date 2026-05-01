# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

# Install pnpm once for all stages.
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy manifests first for layer caching.
COPY package.json pnpm-lock.yaml ./

FROM base AS deps

RUN pnpm install --frozen-lockfile

FROM deps AS dev

COPY tsconfig.api.json ./
COPY src ./src

EXPOSE 3000

CMD ["pnpm", "api:dev"]

FROM deps AS builder

# Copy source needed by the API TypeScript build.
COPY tsconfig.api.json ./
COPY src ./src

# Compile.
RUN pnpm api:build

# Prune dev deps.
RUN pnpm prune --prod

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Non-root user.
RUN apk add --no-cache wget
RUN addgroup -S sikesra && adduser -S sikesra -G sikesra

# Copy compiled output and runtime-only source assets.
# .mjs files must land at the paths the compiled JS expects relative to dist/api/.
COPY --from=builder /app/package.json ./dist/package.json
COPY --from=builder /app/dist/api ./dist/api
COPY --from=builder /app/src/backend ./dist/api/backend
COPY --from=builder /app/src/db ./dist/api/db
COPY --from=builder /app/src/api/middleware/abac.policy.mjs ./dist/api/api/middleware/abac.policy.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER sikesra

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --content-on-error -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/api/api/index.js"]
