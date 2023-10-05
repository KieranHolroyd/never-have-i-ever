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
