#!/bin/sh
set -e

# Build DATABASE_URL from individual components at runtime
# This avoids Docker Compose variable interpolation issues
DB_USER="${DB_USER:-voltbody}"
DB_PASSWORD="${DB_PASSWORD:-voltbody123}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-voltbody}"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node server/index.js
