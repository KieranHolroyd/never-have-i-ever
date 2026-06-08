# Deploying the server on Railway (Docker)

The game server image is built from `server/Dockerfile` with the **repository root** as build context (same as `docker compose -f server/docker-compose.yml`).

## Service settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `/` (repo root) |
| **Config-as-code file** | `/server/railway.json` |
| **Builder** | Dockerfile (`server/Dockerfile`) |

No custom start command is needed — the image `CMD` runs `bun run start` from `/app/server`.

## Runtime variables

Required:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/nhie` |
| `GAME_DATA_DIR` | `./assets/games/` |

`GAME_DATA_DIR` is relative to the container workdir (`/app/server`).

Optional:

| Variable | Purpose |
|----------|---------|
| `AXIOM_TOKEN` | Axiom logging |
| `AXIOM_ORG_ID` | Axiom org |
| `PORT` | Set automatically by Railway |

Migrations run on startup (`src/migrate.ts`).

## Persistent game data

Game JSON files are written under `GAME_DATA_DIR`. Attach a **Railway volume** mounted at `/app/server/assets/games` (or set `GAME_DATA_DIR` to match your mount path).

## Files

- `server/Dockerfile` — production image (Bun 1.3, workspace install, migrations + source)
- `server/railway.json` — Railway builder, watch paths, health check
- `.railwayignore` — excludes `client/` from upload (smaller build context)

## Local parity

```bash
docker compose -f server/docker-compose.yml up --build
```

Build context: repo root (`..` in compose file). Dockerfile path: `server/Dockerfile`.
