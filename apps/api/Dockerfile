# Multi-stage build for NestJS API

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY apps/api/package.json ./package.json
RUN npm i

# Copy source and generate Prisma client, then build
COPY apps/api ./
RUN npx prisma generate
RUN npm run build

# --- Runtime image ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled app
COPY --from=builder /app/dist ./dist

# Package files and Prisma schema for client generation
COPY apps/api/package.json ./package.json
COPY apps/api/prisma ./prisma

# Install only production deps (triggers @prisma/client postinstall)
RUN npm i --omit=dev && npm cache clean --force

EXPOSE 4000
CMD ["node", "dist/main.js"]

