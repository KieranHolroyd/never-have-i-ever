import { z } from "zod";

// Re-export shared types so all server code can import from one place.
export type {
  VoteOptions,
  Catagory,
  Catagories,
  Question,
  NHIEPlayer,
  NHIEGameState,
  GameHistoryEntry,
  ClientMessage,
  ServerMessage,
} from "@nhie/shared";

// ---- Zod schemas (server-only validation) ---------------------------------

export const CatagorySchema = z.object({
  flags: z.object({
    is_nsfw: z.boolean(),
    is_hidden: z.boolean().optional(),
  }),
  questions: z.array(z.string()),
});

export const CatagoriesSchema = z.record(z.string(), CatagorySchema);

// ---- Server-only: game engine infrastructure ------------------------------

export type GameOperationHandler = (
  ws: import("./lib/router").GameSocket,
  data: any
) => Promise<void> | void;

export type GameEngine = {
  /** Unique identifier, e.g. "never-have-i-ever" */
  type: string;
  handlers: Record<string, GameOperationHandler>;
};

export type ActiveGamePlayerSummary = {
  id: string;
  name: string;
  connected: boolean;
};

export type ActiveGameStatus = "waiting" | "in-progress" | "completed";

export type ActiveGameSummary = {
  id: string;
  gameType: "never-have-i-ever" | "cards-against-humanity";
  title: string;
  primaryPlayerName: string;
  phase: string;
  status: ActiveGameStatus;
  playerCount: number;
  connectedPlayerCount: number;
  players: ActiveGamePlayerSummary[];
  createdAt: string;
  href: string;
};

export type ActiveGamesResponse = {
  games: ActiveGameSummary[];
};

export interface GameEngineRegistry {
  register(engine: GameEngine): void;
  get(type: string): GameEngine | undefined;
  has(type: string): boolean;
}
