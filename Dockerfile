# syntax=docker/dockerfile:1
# Kapi Coast — production image for Dokploy.
# Multi-stage so the runtime layer carries no toolchain and no source.

# ---- deps -----------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma needs a DATABASE_URL present at generate time, but never connects.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- runtime --------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Standalone output: server + only the node_modules actually reachable.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI + schema so the container can run migrations on boot.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin ./node_modules/.bin

# Mount a Dokploy volume here so uploaded images survive redeploys.
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads
VOLUME /app/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
