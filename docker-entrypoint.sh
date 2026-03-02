#!/bin/sh
set -e

# Build DATABASE_URL from individual components at runtime
# Use POSTGRES_* variables (set by Coolify) to ensure consistency
DB_USER="${POSTGRES_USER:-voltbody}"
DB_PASSWORD="${POSTGRES_PASSWORD:-voltbody123}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-voltbody}"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo "Connecting to: postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node server/index.js
