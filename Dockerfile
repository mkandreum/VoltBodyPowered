# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built frontend and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma

# Install Prisma CLI
RUN npm install -g prisma

# Expose port
EXPOSE 3000

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && node server/index.js"]
