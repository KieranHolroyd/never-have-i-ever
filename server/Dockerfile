FROM oven/bun:1.2

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Install jq for JSON validation
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/assets/games

# Expose port (assuming the app runs on a port, adjust if needed)
EXPOSE 3000

# Run the project
CMD ["bun", "run", "start"]
