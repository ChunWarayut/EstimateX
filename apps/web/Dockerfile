# Multi-stage build for Next.js web app

FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install deps
COPY apps/web/package.json ./package.json
RUN npm i

# Copy source and build
COPY apps/web ./
RUN npm run build

# --- Runtime image ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next ./.next
COPY apps/web/package.json ./package.json
COPY apps/web/next.config.js ./next.config.js

RUN npm i --omit=dev && npm cache clean --force

EXPOSE 3000
CMD ["npm", "start"]

