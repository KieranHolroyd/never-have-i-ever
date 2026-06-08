# server

Never Have I Ever game server (Bun + PostgreSQL + WebSockets).

## Development

From the **repository root**:

```bash
bun install
cd server
cp .env.example .env   # set DATABASE_URL, GAME_DATA_DIR
bun run dev
```

## Railway (Docker)

See [RAILWAY.md](../RAILWAY.md) at the repo root. Summary:

- Root directory: repo root (`/`)
- Config file: `/railway.json`
- Dockerfile: `/Dockerfile` (copies `server/` into the image)

## Docker

```bash
docker compose -f server/docker-compose.yml up --build
```

Build context is the repo root (`docker-compose.yml` uses `context: ..`).
