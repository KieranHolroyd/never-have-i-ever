// Re-export shared protocol types
import type { NHIEGameState, NHIEPlayer as _Player, Question as _Question, Catagories as _Catagories } from '@nhie/shared';

export {
	VoteOptions,
	type Catagory,
	type Catagories,
	type Question,
	type NHIEPlayer,
	type GameHistoryEntry,
	type CAHBlackCard,
	type CAHWhiteCard,
	type CAHSubmission,
	type CAHPlayer,
	type CAHGameState,
	type CardPack,
	type ActiveGamePlayerSummary,
	type ActiveGameStatus,
	type ActiveGameSummary,
	type ActiveGamesResponse
} from '@nhie/shared';
export type { NHIEGameState } from '@nhie/shared';
export type ClientNHIEGameState = NHIEGameState & { active?: boolean };
export type ClientCAHGameState = import('@nhie/shared').CAHGameState & {
	active?: boolean;
};

// Backwards-compat alias used by existing client components
export type { NHIEPlayer as Player } from '@nhie/shared';

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
	theme?: 'dark' | 'light';
	no_nsfw?: boolean;
	no_tutorials?: boolean;
	show_hidden?: boolean;
	show_debug?: boolean;
};

export type GameData = {
	id: string;
	players: _Player[];
	maxPlayers: number;
	creatorPlayerId?: string | null;
	passwordProtected?: boolean;

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

export type SelectedPacks = {
	[key: string]: boolean; // packId -> selected
};

// Backwards-compat aliases
export type BlackCard = import('@nhie/shared').CAHBlackCard;
export type WhiteCard = import('@nhie/shared').CAHWhiteCard;
