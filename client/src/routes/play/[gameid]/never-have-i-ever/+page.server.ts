import type { Catagories, GameData } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';

type ClientGameData = GameData & {
	active: boolean;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!params.gameid) {
		return redirect(307, '/');
	}
	const req = await fetch(`${env.PUBLIC_SELF_URL}/api/game?id=${params.gameid}`);
	let game: ClientGameData | null = null;
	if (req.status === 200) {
		game = (await req.json()) as ClientGameData;
	}

	const req2 = await fetch(`${env.PUBLIC_SELF_URL}/api/catagories`);
	let cats: Catagories | null = null;
	if (req2.status === 200) {
		cats = (await req2.json()) as Catagories;
	}

	if (!game || !cats) {
		return {};
	}

	return {
		game: game,
		catagories: cats
	};
}
