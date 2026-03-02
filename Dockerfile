# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (includes dev dependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Verify dist folder was created
RUN echo "Checking dist folder..." && ls -la dist/ && ls -la dist/assets/

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Install production dependencies
COPY package*.json ./
RUN npm install --production

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

# Start command: run safe production migrations and start server
CMD ["sh", "-c", "echo 'Starting server...' && npx prisma migrate deploy && echo 'Migrations complete' && node server/index.js"]
