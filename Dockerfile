# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (includes dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Verify dist folder was created
RUN echo "Checking dist folder..." && ls -la dist/ && ls -la dist/assets/

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend and server files
COPY --from=builder /app/dist ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

# Verify frontend was copied to public
RUN echo "Verifying public copy..." && ls -la public/ && ls -la public/assets/

# Generate Prisma Client
RUN npx prisma generate

# Create uploads directory for persistent storage
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start command: run safe production migrations and auto-baseline if DB already has schema (P3005).
# Migrations run with a 90s timeout so a hung DB connection never blocks server startup.
# On any non-P3005 failure the server still starts — static files and health check remain
# available while the DB recovers, preventing a 504 restart loop.
CMD ["sh", "-c", "echo 'Starting server...'; MIGRATE_OUTPUT=$(timeout 90 npx prisma migrate deploy 2>&1); MIGRATE_STATUS=$?; echo \"$MIGRATE_OUTPUT\"; if [ $MIGRATE_STATUS -ne 0 ]; then if echo \"$MIGRATE_OUTPUT\" | grep -q 'P3005'; then echo 'Detected existing non-empty schema. Running Prisma baseline...'; for dir in /app/prisma/migrations/*; do if [ -d \"$dir\" ]; then migration_name=$(basename \"$dir\"); echo \"Marking migration as applied: $migration_name\"; npx prisma migrate resolve --applied \"$migration_name\" || true; fi; done; echo 'Re-running migrate deploy after baseline...'; timeout 90 npx prisma migrate deploy; else echo 'Warning: migrations failed or timed out — starting server anyway to preserve availability.'; fi; fi; echo 'Starting Node.js server...'; node server/index.js"]
