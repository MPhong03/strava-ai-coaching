# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy các file config từ thư mục backend vào container
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install
RUN npx prisma generate

# Copy toàn bộ code backend vào container
COPY backend/ .

RUN npm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

# Copy các file đã build từ stage 1
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Port 3001 cho NestJS
EXPOSE 3001

CMD ["npm", "run", "start:prod"]
