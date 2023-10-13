FROM oven/bun:1.0

# Copy package.json
COPY package.json .

# Install dependencies
RUN bun install

# Copy source code
COPY . .

RUN mkdir -p /home/bun/app/assets/games

# Run the project
CMD ["bun", "run", "start"]
