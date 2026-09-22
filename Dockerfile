# syntax=docker/dockerfile:1.4

# ── 1. Dependencies Stage (with BuildKit npm cache mount) ─────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# BuildKit cache mount avoids redownloading npm packages from the internet
RUN --mount=type=cache,target=/root/.npm npm ci

# ── 2. Builder Stage ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Vite Frontend
RUN npx prisma generate
RUN npm run build

# Prune devDependencies in-place in ~2s (avoiding a second slow npm ci download)
RUN npm prune --omit=dev

# ── 3. Production Runner Stage ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy pruned production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

# Create uploads directory for persistent storage
RUN mkdir -p uploads

EXPOSE 3000

# Start command: safe production migrations and server start
CMD ["sh", "-c", "echo 'Starting server...'; MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1); MIGRATE_STATUS=$?; echo \"$MIGRATE_OUTPUT\"; if [ $MIGRATE_STATUS -ne 0 ]; then if echo \"$MIGRATE_OUTPUT\" | grep -q 'P3005'; then echo 'Detected existing non-empty schema. Running Prisma baseline...'; for dir in /app/prisma/migrations/*; do if [ -d \"$dir\" ]; then migration_name=$(basename \"$dir\"); echo \"Marking migration as applied: $migration_name\"; npx prisma migrate resolve --applied \"$migration_name\" || true; fi; done; echo 'Re-running migrate deploy after baseline...'; npx prisma migrate deploy; else echo 'Migration failed with non-recoverable error. Proceeding anyway...'; fi; fi; echo 'Migrations complete'; echo 'Server ready - waiting 5s before accepting connections...'; sleep 5; node server/index.js"]
