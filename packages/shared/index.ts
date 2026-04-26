// ============================================================
// @nhie/shared — single source of truth for client + server
// Pure TypeScript, zero runtime deps, no build step required.
// ============================================================

// ----------------------------------------------------------------
// Enums
// ----------------------------------------------------------------

export enum VoteOptions {
  Have = 1,
  HaveNot = 2,
  Kinda = 3,
}

// ----------------------------------------------------------------
// Core domain types
// ----------------------------------------------------------------

export type Catagory = {
  flags: {
    is_nsfw: boolean;
    is_hidden?: boolean;
  };
  questions: string[];
};

export type Catagories = { [key: string]: Catagory };

export type Question = {
  catagory: string;
  content: string;
};

export type NHIEPlayer = {
  id: string;
  name: string;
  /** Stored as float in Redis; always a JS number here. */
  score: number;
  connected: boolean;
  this_round: {
    /** "Have" | "Have Not" | "Kinda" | null */
    vote: string | null;
    voted: boolean;
  };
};

export type GameHistoryEntry = {
  question: Question;
  players: NHIEPlayer[];
};

/**
 * The shape of a Never Have I Ever game broadcast to clients.
 * Server-only fields (round_timeout, raw data blob) are excluded.
 */
export type NHIEGameState = {
  id: string;
  gameType: "never-have-i-ever";
  phase: "category_select" | "waiting" | "game_over";
  players: NHIEPlayer[];
  passwordProtected?: boolean;
  /** Currently selected category names */
  catagories: string[];
  current_question: Question;
  history: GameHistoryEntry[];
  waitingForPlayers: boolean;
  gameCompleted: boolean;
  /**
   * Epoch ms when the round timeout started, or 0 if not yet started.
   * Populated in game_state broadcasts during "waiting" phase.
   */
  timeout_start?: number;
  timeout_duration?: number;
};

// ----------------------------------------------------------------
// WebSocket message protocol
// ----------------------------------------------------------------

// --- Messages sent FROM client TO server ---

export type JoinGameMessage = {
  op: "join_game";
  create: boolean;
  playername: string;
  password?: string;
};

export type SetRoomPasswordMessage = {
  op: "set_room_password";
  password?: string;
};

export type SelectCategoriesMessage = {
  op: "select_categories";
};

export type SelectCategoryMessage = {
  op: "select_category";
  catagory: string;
};

export type ConfirmSelectionsMessage = {
  op: "confirm_selections";
};

export type NextQuestionMessage = {
  op: "next_question";
};

export type VoteMessage = {
  op: "vote";
  option: 1 | 2 | 3;
};

export type ResetGameMessage = {
  op: "reset_game";
};

export type PingMessage = {
  op: "ping";
};

export type ReconnectStatusMessage = {
  op: "reconnect_status";
};

export type DisconnectMessage = {
  op: "disconnect";
};

/** Discriminated union of all messages the client can send to the server. */
export type ClientMessage =
  | JoinGameMessage
  | SetRoomPasswordMessage
  | SelectCategoriesMessage
  | SelectCategoryMessage
  | ConfirmSelectionsMessage
  | NextQuestionMessage
  | VoteMessage
  | ResetGameMessage
  | PingMessage
  | ReconnectStatusMessage
  | DisconnectMessage;

// --- Messages sent FROM server TO client ---

export type GameStateMessage = {
  op: "game_state";
  game: NHIEGameState;
};

export type NewRoundMessage = {
  op: "new_round";
};

export type VoteCastMessage = {
  op: "vote_cast";
  player: NHIEPlayer;
  vote: string;
};

export type RoundTimeoutMessage = {
  op: "round_timeout";
  message: string;
};

export type PongMessage = {
  op: "pong";
};

export type ReconnectStatusResponseMessage = {
  op: "reconnect_status";
  reconnecting: boolean;
  attemptCount: number;
  nextAttemptIn: number;
};

export type ErrorMessage = {
  op: "error";
  message: string;
};

/** Discriminated union of all messages the server can send to the client. */
export type ServerMessage =
  | GameStateMessage
  | NewRoundMessage
  | VoteCastMessage
  | RoundTimeoutMessage
  | PongMessage
  | ReconnectStatusResponseMessage
  | ErrorMessage;
