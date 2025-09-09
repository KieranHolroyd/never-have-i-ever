import { z } from "zod";

export type Catagories = { [key: string]: Catagory };
export type Catagory = {
  flags: {
    is_nsfw: boolean;
  };
  questions: string[];
};

// Zod schemas for type validation
export const CatagorySchema = z.object({
  flags: z.object({
    is_nsfw: z.boolean(),
  }),
  questions: z.array(z.string()),
});

export const CatagoriesSchema = z.record(z.string(), CatagorySchema);

// TAKEN FROM ../client/src/lib/types.ts
export enum VoteOptions {
  Have = 1,
  HaveNot = 2,
  Kinda = 3,
}

export type Player = {
  id: string;
  name: string;
  score: number;

  this_round: {
    vote: string;
    voted: boolean;
  };
  connected: boolean;
};
//--------

export type Question = {
  catagory: string;
  content: string;
};

export type GameData = {
  id: string;
  players: Player[];

  catagories: string[];

  current_question: Question;

  history: {
    question: Question;
    players: Player[];
  }[];

  // Control States
  catagory_select: boolean;
  game_completed: boolean;
  waiting_for_players: boolean;

  // Round timeout
  round_timeout?: NodeJS.Timeout;

  // Local game state
  data: Catagories;
};

// Generic multi-game engine support
export type GameOperationHandler = (ws: import("./lib/router").GameSocket, data: any) => Promise<void> | void;

export type GameEngine = {
  // Unique identifier for engine (e.g., "never-have-i-ever", "cards-against-humanity")
  type: string;
  // Map of op => handler
  handlers: Record<string, GameOperationHandler>;
};

export interface GameEngineRegistry {
  register(engine: GameEngine): void;
  get(type: string): GameEngine | undefined;
  has(type: string): boolean;
}
