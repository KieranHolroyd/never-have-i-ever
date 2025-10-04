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

// Unified game state interfaces

export interface IPlayer {
  id: string;
  name: string;
  score: number;
  connected: boolean;
}

export interface ICAHPlayer extends IPlayer {
  hand: CAHWhiteCard[];
  isJudge: boolean;
}

export interface INHIEPlayer extends IPlayer {
  this_round: {
    vote: string | null;
    voted: boolean;
  };
}

// CAH specific types
export type CAHBlackCard = {
  id: string;
  text: string;
  pick: number;
};

export type CAHWhiteCard = {
  id: string;
  text: string;
};

export type CAHSubmission = {
  playerId: string;
  cards: CAHWhiteCard[];
  playerName: string;
};

// Unified game state
export interface IGameState {
  id: string;
  gameType: 'cards-against-humanity' | 'never-have-i-ever';
  players: IPlayer[];
  phase: string;
  waitingForPlayers: boolean;
  gameCompleted: boolean;
}

export interface ICAHGameState extends IGameState {
  gameType: 'cards-against-humanity';
  players: ICAHPlayer[];
  selectedPacks: string[];
  currentJudge: string | null;
  currentBlackCard: CAHBlackCard | null;
  submittedCards: CAHSubmission[];
  roundWinner: string | null;
  deck: {
    blackCards: CAHBlackCard[];
    whiteCards: CAHWhiteCard[];
  };
  handSize: number;
  maxRounds: number;
  currentRound: number;
}

export interface INHIEGameState extends IGameState {
  gameType: 'never-have-i-ever';
  players: INHIEPlayer[];
  current_question: Question;
  catagories: string[];
  data: Catagories;
  history: {
    question: Question;
    players: INHIEPlayer[];
  }[];
  round_timeout?: NodeJS.Timeout;
}

// Aliases for backward compatibility
export type CAHGameState = ICAHGameState;
export type NHIEGameState = INHIEGameState;
export type CAHPlayer = ICAHPlayer;
export type NHIEPlayer = INHIEPlayer;
