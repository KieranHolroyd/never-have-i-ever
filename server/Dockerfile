FROM oven/bun:1.2

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/assets/games

# Expose port (assuming the app runs on a port, adjust if needed)
EXPOSE 3000

# Run the project
CMD ["bun", "run", "start"]
