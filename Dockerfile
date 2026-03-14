# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
# Copy prisma schema
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the backend code
COPY backend/ .

# Build the application (NestJS sẽ tự động copy views vào dist/views)
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Set environment to production
ENV NODE_ENV=production

# Port 3001
EXPOSE 3001

# Command to start the app
CMD ["node", "dist/src/main.js"]
