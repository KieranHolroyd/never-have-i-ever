import { fetchActiveGames } from '$lib/api.js';
import { v4 } from 'uuid';

export async function load({ fetch }) {
	const { games } = await fetchActiveGames(fetch);

	return {
		newgame_nhie_id: v4(),
		newgame_cah_id: v4(),
		active_games_count: games.length
	};
}
