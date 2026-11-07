# =================================================================
# PerPay x402 Hedera Payment Service - Production Cloud Run Container
# =================================================================
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
COPY x402-service/package*.json ./
RUN npm install

# Copy source code and build TypeScript
COPY x402-service/tsconfig.json ./
COPY x402-service/src ./src
RUN npm run build

# -----------------------------------------------------------------
# Production Runtime Image
# -----------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4020 \
    NODE_OPTIONS="--experimental-sqlite"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY x402-service/package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

EXPOSE 4020

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start x402 service
CMD ["sh", "-c", "exec node --experimental-sqlite dist/index.js"]

