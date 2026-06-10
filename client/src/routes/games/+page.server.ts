import { fetchActiveGames } from '$lib/api.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const { games } = await fetchActiveGames(fetch);

	return { games };
};
