# Deploying the server on Railway (Railpack)

The game server is a **Bun workspace** package. It depends on `@nhie/shared` from `packages/shared/`, so Railway must build from the **repository root**, not the `server/` folder alone.

## Service settings

| Setting | Value |
|--------|--------|
| **Root Directory** | `/` (repo root) |
| **Config-as-code file** | `/server/railway.json` |
| **Builder** | Railpack (set in `railway.json`) |

### Build variable

Add this **service variable** (build-time) so Railpack picks up the server config:

```
RAILPACK_CONFIG_FILE=server/railpack.json
```

## Runtime variables

Required:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/nhie` |
| `GAME_DATA_DIR` | `./server/assets/games/` |

Optional:

| Variable | Purpose |
|----------|---------|
| `AXIOM_TOKEN` | Axiom logging |
| `AXIOM_ORG_ID` | Axiom org |
| `PORT` | Set automatically by Railway |

Migrations run on startup (`src/migrate.ts`).

## Files

- `server/railpack.json` — install steps, Bun version, start command
- `server/railway.json` — Railway watch paths, health check, restart policy
- `.railwayignore` — excludes `client/` from upload

## Local parity

This mirrors `server/Dockerfile` (repo-root context, workspace install, `bun run start` in `server/`).
