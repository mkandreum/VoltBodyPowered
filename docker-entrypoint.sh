#!/bin/sh
set -e

# Build DATABASE_URL from individual components at runtime
DB_USER="${POSTGRES_USER:-voltbody}"
DB_PASSWORD="${POSTGRES_PASSWORD:-voltbody123}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-voltbody}"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo "Database: ${DB_NAME} at ${DB_HOST}:${DB_PORT}"
echo "Waiting for database to be ready (initial 10s wait)..."
sleep 10

# Run migrations with retry logic - let Prisma handle connection retries
echo "Running Prisma migrations..."
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma migrate deploy; then
    echo "Migrations completed successfully"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "Migration failed, retrying in 10 seconds... (attempt $RETRY_COUNT/$MAX_RETRIES)"
      sleep 10
    else
      echo "Migration failed after $MAX_RETRIES attempts"
      exit 1
    fi
  fi
done

echo "Starting server on port 3000..."
exec node server/index.js
