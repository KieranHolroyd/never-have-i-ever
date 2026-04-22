// Re-export shared protocol types
export { VoteOptions, type Catagory, type Catagories, type Question, type NHIEPlayer, type NHIEGameState, type GameHistoryEntry } from '@nhie/shared';
// Backwards-compat alias used by existing client components
export type { NHIEPlayer as Player } from '@nhie/shared';

// Local aliases for use within this file
import type { NHIEPlayer as _Player, Question as _Question, Catagories as _Catagories } from '@nhie/shared';

export enum Status {
	CONNECTING,
	CONNECTED,
	DISCONNECTED
}

export type GameRound = {
	question: {
		catagory: string;
		content: string;
	};
	players: _Player[];
};

export type Settings = {
	no_nsfw?: boolean;
	no_tutorials?: boolean;
	show_hidden?: boolean;
	show_debug?: boolean;
};

export type GameData = {
	id: string;
	players: _Player[];

	catagories: string[];

	current_question: _Question;

	history: {
		question: _Question;
		players: _Player[];
	}[];

	// Control States
	catagory_select: boolean;
	game_completed: boolean;
	waiting_for_players: boolean;

	// Local game state
	data: _Catagories;
};

// Cards Against Humanity Types
export type CardPack = {
	id: string;
	name: string;
	blackCards: number;
	whiteCards: number;
	isOfficial: boolean;
	isNSFW: boolean;
};

export type BlackCard = {
	id: string;
	text: string;
	pick: number; // Number of white cards to pick (usually 1, sometimes 2 or 3)
};

export type WhiteCard = {
	id: string;
	text: string;
};

export type SelectedPacks = {
	[key: string]: boolean; // packId -> selected
};

// Cards Against Humanity Types
export type CAHGameState = {
	id: string;
	players: CAHPlayer[];
	selectedPacks: string[];

	// Game phases
	phase: 'waiting' | 'selecting' | 'judging' | 'scoring' | 'game_over';

	// Current round state
	currentJudge: string | null;
	currentBlackCard: CAHBlackCard | null;
	submittedCards: CAHSubmission[];
	roundWinner: string | null;

	// Deck state
	deck: {
		blackCards: CAHBlackCard[];
		whiteCards: CAHWhiteCard[];
	};

	// Game settings
	handSize: number;
	maxRounds: number;
	currentRound: number;

	// Control states
	waitingForPlayers: boolean;
	gameCompleted: boolean;
};

export type CAHPlayer = {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	hand: CAHWhiteCard[];
	isJudge: boolean;
};

export type CAHBlackCard = {
	id: string;
	text: string;
	pick: number; // Number of white cards to pick (usually 1, sometimes 2 or 3)
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
