# syntax=docker/dockerfile:1

# ===== MULTI-STAGE BUILD ALTERNATIVE (for smaller production images) =====
# Uncomment the lines below and comment out the single-stage build for a smaller image:
#
# FROM oven/bun:1.2-slim as builder
# WORKDIR /app
# COPY package.json bun.lockb* ./
# RUN bun install --frozen-lockfile
# COPY . .
# RUN bun run build  # If you add a build script later
#
# FROM oven/bun:1.2-slim as runtime
# WORKDIR /app
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package.json ./
# COPY --from=builder /app/dist ./dist  # Built application
# ========================================================================

# Use specific version for better caching and reproducibility
FROM oven/bun:1.3-slim

# Set working directory to workspace root
WORKDIR /app

# Install system dependencies in a single layer for better caching
# Combine apt commands to reduce layers and use --no-install-recommends for smaller image
# Use build cache mount for apt cache to speed up subsequent builds
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
	--mount=type=cache,target=/var/lib/apt,sharing=locked \
	apt-get update && apt-get install -y --no-install-recommends \
	jq \
	ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& apt-get clean

# Copy workspace root package.json and lockfile for workspace resolution
COPY package.json bun.lock* ./

# Copy shared workspace package (required dependency)
COPY packages/shared/ ./packages/shared/

# Create a stub for the client workspace so bun can resolve the workspace graph
# The client is listed in root workspaces but not needed at runtime
RUN mkdir -p client && echo '{"name":"app","private":true}' > client/package.json

# Copy server package files for dependency installation
COPY server/package.json ./server/

# Install all workspace dependencies from root
# Use cache mount for bun cache to speed up subsequent builds
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install

# Copy static assets that don't change often
# This allows better layer caching for subsequent builds
COPY server/assets/data.json server/assets/db.sqlite ./server/assets/

# Create necessary directories
RUN mkdir -p /app/server/assets/games

# Copy source code (put this last as it changes most frequently)
COPY server/src/ ./server/src/
COPY server/tsconfig.json ./server/

WORKDIR /app/server

# Expose port
EXPOSE 3000

# Use exec form for better signal handling
CMD ["bun", "run", "start"]
