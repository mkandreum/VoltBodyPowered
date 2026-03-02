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

# Wait for PostgreSQL to be ready using TCP connection test
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if timeout 2 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    echo "PostgreSQL is ready"
    break
  fi
  attempt=$((attempt + 1))
  echo "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "PostgreSQL did not become ready in time"
  exit 1
fi

# Run migrations with retry logic
echo "Running Prisma migrations..."
for i in 1 2 3 4 5; do
  npx prisma migrate deploy && break || {
    if [ $i -lt 5 ]; then
      echo "Migration failed, retrying in 5 seconds... (attempt $i/5)"
      sleep 5
    else
      echo "Migration failed after 5 attempts"
      exit 1
    fi
  }
done

echo "Starting server..."
exec node server/index.js
