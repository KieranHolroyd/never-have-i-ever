<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into this SvelteKit party game platform. Here is a summary of all changes made:

**New files created:**
- `src/hooks.client.ts` — initialises `posthog-js` via the SvelteKit `init` hook, sets up a reverse proxy path (`/ingest`), and attaches `captureException` to the global `handleError` hook for automatic client-side error tracking.
- `src/hooks.server.ts` — implements a reverse proxy at `/ingest/*` that forwards requests to `eu.i.posthog.com` / `eu-assets.i.posthog.com` (to reduce ad-blocker interference), and captures server-side errors via `handleError`.
- `src/lib/server/posthog.ts` — singleton `posthog-node` client used by server-side code.
- `.env.local` — `PUBLIC_POSTHOG_PROJECT_TOKEN` and `PUBLIC_POSTHOG_HOST` environment variables.

**Existing files modified:**
- `svelte.config.js` — added `paths.relative: false` (required for PostHog session replay to work with SSR).
- `src/routes/+page.svelte` — `game_started` event fired when a player clicks "Start New Game" for either NHIE or CAH.
- `src/routes/play/name/+page.svelte` — `nickname_set` event + `posthog.identify()` fired when a player confirms their nickname (links all subsequent events to the player's persistent local ID).
- `src/lib/components/never-have-i-ever/Game.svelte` — `game_joined`, `nhie_categories_confirmed`, `nhie_vote_cast`, `nhie_next_question`, `game_shared`, `nhie_game_completed`, and `game_reset` events.
- `src/lib/components/cah/CahGame.svelte` — `game_joined`, `cah_cards_submitted`, `cah_winner_selected`, and `game_reset` events.
- `src/lib/components/cah/CahCardPackSelection.svelte` — `cah_packs_selected` event with pack count, IDs, and total card counts.

| Event | Description | File |
|---|---|---|
| `game_started` | Player clicks "Start New Game" on homepage | `src/routes/+page.svelte` |
| `nickname_set` | Player confirms their nickname (also calls `identify`) | `src/routes/play/name/+page.svelte` |
| `game_joined` | WebSocket connection established successfully | `src/lib/components/never-have-i-ever/Game.svelte`, `src/lib/components/cah/CahGame.svelte` |
| `nhie_categories_confirmed` | Player confirms category selection to start NHIE | `src/lib/components/never-have-i-ever/Game.svelte` |
| `nhie_vote_cast` | Player votes Have / Kinda / Have Not | `src/lib/components/never-have-i-ever/Game.svelte` |
| `nhie_next_question` | Player advances to the next NHIE question | `src/lib/components/never-have-i-ever/Game.svelte` |
| `game_shared` | Player shares the game link (native or clipboard) | `src/lib/components/never-have-i-ever/Game.svelte` |
| `nhie_game_completed` | NHIE game reaches the end (no more questions) | `src/lib/components/never-have-i-ever/Game.svelte` |
| `game_reset` | Player resets the game back to the start | `src/lib/components/never-have-i-ever/Game.svelte`, `src/lib/components/cah/CahGame.svelte` |
| `cah_packs_selected` | Player selects card packs and starts a CAH game | `src/lib/components/cah/CahCardPackSelection.svelte` |
| `cah_cards_submitted` | Player submits white card selection in CAH | `src/lib/components/cah/CahGame.svelte` |
| `cah_winner_selected` | Judge selects the winning CAH submission | `src/lib/components/cah/CahGame.svelte` |
| `server_error` | Unhandled server-side error caught | `src/hooks.server.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://eu.posthog.com/project/164551/dashboard/638139
- **Game starts by type (trend):** https://eu.posthog.com/project/164551/insights/bhY8oGMm
- **Game start → join → first vote funnel (NHIE):** https://eu.posthog.com/project/164551/insights/0W2tpdS8
- **NHIE vote distribution:** https://eu.posthog.com/project/164551/insights/PDVe0rp1
- **Game completion vs reset (churn indicator):** https://eu.posthog.com/project/164551/insights/mwxzKJGI
- **Game sharing trend:** https://eu.posthog.com/project/164551/insights/QSh949cm

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-sveltekit/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
