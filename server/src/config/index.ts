import { z } from "zod";

const configSchema = z.object({
  GAME_DATA_DIR: z.string(),
  VALKEY_URI: z.string(),
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_ORG_ID: z.string().optional(),
});

const rawConfig = {
  GAME_DATA_DIR: Bun.env.GAME_DATA_DIR || process.env.GAME_DATA_DIR || './tests/fixtures/games/',
  VALKEY_URI: Bun.env.VALKEY_URI || process.env.VALKEY_URI || 'valkey://localhost:6379',
  AXIOM_TOKEN: Bun.env.AXIOM_TOKEN || process.env.AXIOM_TOKEN,
  AXIOM_ORG_ID: Bun.env.AXIOM_ORG_ID || process.env.AXIOM_ORG_ID,
};

export const config = configSchema.parse(rawConfig);

export const SERVER_CONFIG = {
  PORT: 3000,
  CLIENT_UPDATE_DELAY: 30000, // 30 seconds
  GAME_SAVE_INTERVAL: 5000, // 5 seconds
  MAX_PLAYERS_PER_GAME: 12,
  RECONNECT: {
    INITIAL_INTERVAL: 10000, // 10 seconds
    MAX_INTERVAL: 300000, // 5 minutes
    BACKOFF_MULTIPLIER: 2, // Exponential backoff multiplier
    MAX_ATTEMPTS: 30, // Maximum reconnect attempts
    INITIAL_PHASE_DURATION: 120000, // 2 minutes of initial 10s intervals
  },
} as const;

export const ROUTES = {
  HOME: "/",
  SPECIAL: "/special",
  WEBSOCKET: "/ws",
  CATEGORIES_API: "/api/catagories",
  GAME_API: "/api/game",
  GITHUB_WEBHOOK: "/hook/github",
} as const;

export const WEBSOCKET_PARAMS = {
  GAME: "game",
  PLAYER: "player",
  PLAYING: "playing",
} as const;

export const REQUIRED_ENV_VARS = [
  "GAME_DATA_DIR",
  "VALKEY_URI",
] as const;

export const OPTIONAL_ENV_VARS = [
  "AXIOM_TOKEN",
  "AXIOM_ORG_ID",
] as const;
