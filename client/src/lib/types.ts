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
};

export type Catagories = {
	[key: string]: Catagory;
};
export type Catagory = {
	flags: {
		is_nsfw: boolean;
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

	// Local game state
	data: Catagories;
};
