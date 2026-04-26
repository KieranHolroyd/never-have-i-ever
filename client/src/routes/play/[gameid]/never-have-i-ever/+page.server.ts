import type { Catagories, GameData } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';

type ClientGameData = GameData & {
	active: boolean;
	passwordProtected?: boolean;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!params.gameid) {
		return redirect(307, '/');
	}

	let game: ClientGameData | null = null;
	try {
		const req = await fetch(`${env.PUBLIC_API_URL}api/game?id=${params.gameid}`);
		if (req.status === 200) {
			game = (await req.json()) as ClientGameData;
		}
	} catch {
		// fall through and return an empty state below
	}

	let cats: Catagories | null = null;
	try {
		const req2 = await fetch(`${env.PUBLIC_API_URL}api/catagories`);
		if (req2.status === 200) {
			cats = (await req2.json()) as Catagories;
		}
	} catch {
		// fall through and return an empty state below
	}

	if (!game || !cats) {
		return {};
	}

	return {
		game: game,
		catagories: cats
	};
};
