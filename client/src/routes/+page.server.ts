import { env } from '$env/dynamic/public';
import type { ActiveGamesResponse } from '$lib/types';
import { v4 } from 'uuid';

	export async function load({ fetch }) {
	let active_games_count = 0;

	try {
		const response = await fetch(`${env.PUBLIC_API_URL}api/active-games`);

		if (response.ok) {
			const payload = (await response.json()) as ActiveGamesResponse;
			active_games_count = payload.games.length;
		}
	} catch {
		active_games_count = 0;
	}

	return {
		newgame_nhie_id: v4(),
		newgame_cah_id: v4(),
		active_games_count
	};
}
