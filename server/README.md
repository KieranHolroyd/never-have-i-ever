# server

Never Have I Ever game server (Bun + PostgreSQL + WebSockets).

## Development

From the **repository root**:

```bash
bun install
cd server
cp .env.example .env          # set DB_PASSWORD + DATABASE_URL (localhost:5432)
cp .env.example .env.local    # same DATABASE_URL for drizzle-kit CLI
docker compose up db -d --wait  # PostgreSQL only; --wait until healthy before bun dev
bun run dev
```

`DATABASE_URL` must use port **5432** (the host port mapped by `docker-compose.yml`).
For the SvelteKit client, set the same `DATABASE_URL` and `BETTER_AUTH_SECRET` in `client/.env.local`.

## Railway (Docker)

See [RAILWAY.md](../RAILWAY.md) at the repo root. Summary:

- Root directory: repo root (`/`)
- Config file: `/railway.json`
- Dockerfile: `/Dockerfile` (copies `server/` into the image)

## Docker

```bash
# Database only (typical local dev — run the server with bun dev):
docker compose -f server/docker-compose.yml up db -d --wait

# Full stack (server in Docker):
docker compose -f server/docker-compose.yml --profile full up --build
```

Build context is the repo root (`docker-compose.yml` uses `context: ..`).
