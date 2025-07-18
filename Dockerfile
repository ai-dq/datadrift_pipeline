FROM oven/bun:latest AS builder
WORKDIR /app

ARG NEXT_PUBLIC_LABELSTUDIO_URL
ARG NEXT_PUBLIC_CORE_DEMO_URL
ARG NEXT_PUBLIC_CORE_API_SWAGGER_URL

ENV NEXT_PUBLIC_LABELSTUDIO_URL=$NEXT_PUBLIC_LABELSTUDIO_URL
ENV NEXT_PUBLIC_CORE_DEMO_URL=$NEXT_PUBLIC_CORE_DEMO_URL
ENV NEXT_PUBLIC_CORE_API_SWAGGER_URL=$NEXT_PUBLIC_CORE_API_SWAGGER_URL

# Install curl for health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Health check tools stage
FROM oven/bun:latest AS health-tools
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

FROM oven/bun:latest AS runner
WORKDIR /app

# Copy curl from the health-tools stage
COPY --from=health-tools /usr/bin/curl /usr/bin/curl
COPY --from=health-tools /usr/lib /usr/lib

ENV NODE_ENV=production
EXPOSE 3000

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/src ./src

RUN bun install --production
