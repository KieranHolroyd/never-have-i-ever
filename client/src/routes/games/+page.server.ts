import { env } from '$env/dynamic/public';
import type { ActiveGamesResponse } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch(`${env.PUBLIC_API_URL}api/active-games`);

	if (!response.ok) {
		return {
			games: []
		};
	}

	const payload = (await response.json()) as ActiveGamesResponse;

	return {
		games: payload.games
	};
};