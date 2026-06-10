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
  maxPlayers: number;
  creatorPlayerId?: string | null;
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
// Cards Against Humanity domain types
// ----------------------------------------------------------------

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

export type CAHPlayer = {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  hand: CAHWhiteCard[];
  isJudge: boolean;
};

export type CAHGameState = {
  id: string;
  players: CAHPlayer[];
  selectedPacks: string[];
  maxPlayers: number;
  creatorPlayerId?: string | null;
  passwordProtected?: boolean;
  phase: "waiting" | "selecting" | "judging" | "scoring" | "game_over";
  currentJudge: string | null;
  currentBlackCard: CAHBlackCard | null;
  submittedCards: CAHSubmission[];
  roundWinner: string | null;
  deck: { blackCards: CAHBlackCard[]; whiteCards: CAHWhiteCard[] };
  handSize: number;
  maxRounds: number;
  currentRound: number;
  waitingForPlayers: boolean;
  gameCompleted: boolean;
};

export type CardPack = {
  id: string;
  name: string;
  blackCards: number;
  whiteCards: number;
  isOfficial: boolean;
  isNSFW: boolean;
};

// ----------------------------------------------------------------
// Lobby / REST API types
// ----------------------------------------------------------------

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
  passwordProtected: boolean;
  phase: string;
  status: ActiveGameStatus;
  maxPlayers: number;
  playerCount: number;
  connectedPlayerCount: number;
  players: ActiveGamePlayerSummary[];
  createdAt: string;
  href: string;
};

export type ActiveGamesResponse = {
  games: ActiveGameSummary[];
};

// ----------------------------------------------------------------
// WebSocket message protocol
// ----------------------------------------------------------------

// --- Messages sent FROM client TO server ---

export type JoinGameMessage = {
  op: "join_game";
  create?: boolean;
  playername?: string;
  password?: string;
};

export type SetRoomPasswordMessage = {
  op: "set_room_password";
  password?: string;
};

export type SetMaxPlayersMessage = {
  op: "set_max_players";
  maxPlayers: number;
};

export type RemovePlayerMessage = {
  op: "remove_player";
  playerId: string;
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

export type SelectPacksMessage = {
  op: "select_packs";
  packIds: string[];
  maxRounds?: number;
  handSize?: number;
  maxPlayers?: number;
};

export type SubmitCardsMessage = {
  op: "submit_cards";
  cardIds: string[];
};

export type SelectWinnerMessage = {
  op: "select_winner";
  winnerPlayerId: string;
};

/** Discriminated union of all messages the client can send to the server. */
export type ClientMessage =
  | JoinGameMessage
  | SetRoomPasswordMessage
  | SetMaxPlayersMessage
  | RemovePlayerMessage
  | SelectCategoriesMessage
  | SelectCategoryMessage
  | ConfirmSelectionsMessage
  | NextQuestionMessage
  | VoteMessage
  | ResetGameMessage
  | PingMessage
  | ReconnectStatusMessage
  | SelectPacksMessage
  | SubmitCardsMessage
  | SelectWinnerMessage;

// --- Messages sent FROM server TO client ---

export type OpenMessage = {
  op: "open";
  message: string;
  postDeploymentReconnect?: boolean;
};

export type GameStateMessage = {
  op: "game_state";
  game: NHIEGameState | CAHGameState;
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

export type StructuredErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  operation?: string;
};

export type ErrorMessage = {
  op: "error";
  /** Legacy flat error shape used by some engine handlers */
  message?: string;
  /** Standard middleware error shape */
  error?: StructuredErrorBody;
};

export type RemovedFromGameMessage = {
  op: "removed_from_game";
  message: string;
};

export type GithubPushMessage = {
  op: "github_push";
  delay: number;
  notification: string;
  showReloadButton?: boolean;
};

/** Discriminated union of all messages the server can send to the client. */
export type ServerMessage =
  | OpenMessage
  | GameStateMessage
  | NewRoundMessage
  | VoteCastMessage
  | RoundTimeoutMessage
  | PongMessage
  | ReconnectStatusResponseMessage
  | ErrorMessage
  | RemovedFromGameMessage
  | GithubPushMessage;
