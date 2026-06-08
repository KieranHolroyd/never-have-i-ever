# syntax=docker/dockerfile:1
# Game server image — build context is the repository root.
# Application code lives under server/; shared types under packages/shared/.

FROM oven/bun:1.3-slim

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
	--mount=type=cache,target=/var/lib/apt,sharing=locked \
	apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates \
	jq \
	&& rm -rf /var/lib/apt/lists/* \
	&& apt-get clean

# Workspace root
COPY package.json bun.lock* ./

# Workspace packages
COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/

# Stub client workspace (listed in root package.json but not needed at runtime)
RUN mkdir -p client && echo '{"name":"app","private":true}' > client/package.json

# Server package manifest — install deps before copying source
COPY server/package.json ./server/

RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install

# Server runtime files
COPY server/assets/data.json ./server/assets/
COPY server/drizzle/ ./server/drizzle/
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/

RUN mkdir -p server/assets/games

WORKDIR /app/server

EXPOSE 3000

CMD ["bun", "run", "start"]
