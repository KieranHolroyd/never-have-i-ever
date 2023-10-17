import { env } from '$env/dynamic/public';
import type { Catagories, GameData } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';

type ClientGameData = GameData & {
	active: boolean;
};

export async function load({ params }) {
	if (!params.gameid) {
		return redirect(307, '/');
	}
	const req = await fetch(`${env.PUBLIC_API_URL}api/game?id=${params.gameid}`);
	const game = (await req.json()) as ClientGameData;
	const req2 = await fetch(`${env.PUBLIC_API_URL}api/catagories`);
	const cats = (await req2.json()) as Catagories;

	if (req.status !== 200) {
		return {};
	}
	if (req2.status !== 200) {
		return redirect(307, '/');
	}

	return {
		game: game,
		catagories: cats
	};
}
