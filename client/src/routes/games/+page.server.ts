import { env } from '$env/dynamic/public';
import type { ActiveGamesResponse } from '$lib/types';
import type { PageServerLoad } from './$types';

const validGameTypes = new Set(['all', 'never-have-i-ever', 'cards-against-humanity']);
const validStatuses = new Set(['all', 'waiting', 'in-progress', 'completed']);

export const load: PageServerLoad = async ({ fetch, url }) => {
	const query = url.searchParams.get('q') ?? '';
	const gameType = url.searchParams.get('type') ?? 'all';
	const status = url.searchParams.get('status') ?? 'all';
	const fallback = {
		games: [],
		initialSearchQuery: query,
		initialGameType: validGameTypes.has(gameType) ? gameType : 'all',
		initialStatus: validStatuses.has(status) ? status : 'all'
	};

	let response: Response;
	try {
		response = await fetch(`${env.PUBLIC_API_URL}api/active-games`);
	} catch {
		return fallback;
	}

	if (!response.ok) {
		return fallback;
	}

	const payload = (await response.json()) as ActiveGamesResponse;

	return {
		games: payload.games,
		initialSearchQuery: query,
		initialGameType: validGameTypes.has(gameType) ? gameType : 'all',
		initialStatus: validStatuses.has(status) ? status : 'all'
	};
};