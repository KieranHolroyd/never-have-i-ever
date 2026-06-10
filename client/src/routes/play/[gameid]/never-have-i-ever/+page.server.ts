import { fetchCatagories, fetchGame } from '$lib/api.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!params.gameid) {
		return redirect(307, '/');
	}

	const [game, catagories] = await Promise.all([
		fetchGame(params.gameid, fetch),
		fetchCatagories(fetch)
	]);

	return {
		game,
		catagories: catagories ?? undefined
	};
};
