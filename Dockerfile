FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
# RUN npm ci --only=production=false
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production Stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
# RUN npm ci --only=production
RUN npm ci --include=dev


COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000

# Run migrations/push schema then start the app
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
