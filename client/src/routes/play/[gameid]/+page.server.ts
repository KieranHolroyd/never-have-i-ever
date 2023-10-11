import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';

type Player = {
	id: string;
	name: string;
	score: number;

	this_round: {
		vote: string;
		voted: boolean;
	};
	connected: boolean;
};
type GameData = {
	id: string;
	players: Player[];

	catagories: string[];

	current_question: {
		catagory: string;
		content: string;
	};

	// Control States
	catagory_select: boolean;
	game_completed: boolean;

	// CLIENT SIDE ONLY
	active: boolean;
};

export async function load({ params }) {
	if (!params.gameid) {
		return redirect(307, '/');
	}
	const req = await fetch(`${env.PUBLIC_API_URL}api/game?id=${params.gameid}`);
	const game = (await req.json()) as GameData;

	if (req.status !== 200) {
		return {};
	}

	return {
		game: game
	};
}
