FROM oven/bun:1.0

# Copy package.json
COPY package.json .

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Run the project
CMD ["bun", "run", "start"]