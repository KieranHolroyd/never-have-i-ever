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
};
