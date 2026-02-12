### Multi-stage container for the web application ###

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /workspace

COPY package.json pnpm-lock.yaml ./
COPY apps apps
COPY packages packages

RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter web build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/apps/web/.next ./.next
COPY --from=builder /workspace/apps/web/public ./public
COPY --from=builder /workspace/apps/web/package.json ./apps/web/package.json

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start"]
