export enum Status {
	CONNECTING,
	CONNECTED,
	DISCONNECTED
}
export enum VoteOptions {
	Have = 1,
	HaveNot = 2,
	Kinda = 3
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

export type GameRound = {
	question: {
		catagory: string;
		content: string;
	};
	players: Player[];
};

export type Settings = {
	no_nsfw?: boolean;
	no_tutorials?: boolean;
	show_hidden?: boolean;
	show_debug?: boolean;
};

export type Catagories = {
	[key: string]: Catagory;
};
export type Catagory = {
	flags: {
		is_nsfw?: boolean;
		is_hidden?: boolean;
	};
	questions: string[];
};

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

	// Local game state
	data: Catagories;
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
