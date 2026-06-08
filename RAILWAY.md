# Deploying the server on Railway

Railway builds the **root `Dockerfile`** with the repository root as context. Application source is under `server/`; the Dockerfile copies only what the server needs.

## Service settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `/` (default — repo root) |
| **Config-as-code file** | `/railway.json` |
| **Builder** | Dockerfile (`Dockerfile` at repo root) |

No start command override — image `CMD` is `bun run start` in `/app/server`.

## Runtime variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/nhie` |
| `GAME_DATA_DIR` | Yes | `./assets/games/` |
| `PORT` | No | Set by Railway |
| `AXIOM_TOKEN` | No | Axiom logging |
| `AXIOM_ORG_ID` | No | Axiom org |

`GAME_DATA_DIR` is relative to `/app/server` (container workdir).

Migrations run on startup (`server/src/migrate.ts`).

## Persistent game data

Mount a Railway volume at `/app/server/assets/games`, or point `GAME_DATA_DIR` at your mount path.

## Local build (same image)

```bash
docker build -t nhie-server .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e GAME_DATA_DIR=./assets/games/ \
  nhie-server
```

Or with compose:

```bash
docker compose -f server/docker-compose.yml up --build
```
