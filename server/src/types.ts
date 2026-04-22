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

export interface GameEngineRegistry {
  register(engine: GameEngine): void;
  get(type: string): GameEngine | undefined;
  has(type: string): boolean;
}
