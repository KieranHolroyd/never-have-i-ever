export type Catagories = { [key: string]: Catagory };
export type Catagory = {
  flags: {
    is_nsfw: boolean;
  };
  questions: string[];
};

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
