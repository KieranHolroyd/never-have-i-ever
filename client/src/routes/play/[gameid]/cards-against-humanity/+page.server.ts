import { fetchCAHGame } from '$lib/api.js';
import type { ClientCAHGameState } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!params.gameid) {
		return redirect(307, '/');
	}

	const game = await fetchCAHGame(params.gameid, fetch);
	if (game) {
		return { game };
	}

	return {
		game: {
			id: params.gameid,
			players: [],
			selectedPacks: [],
			maxPlayers: 20,
			phase: 'waiting',
			currentJudge: null,
			currentBlackCard: null,
			submittedCards: [],
			roundWinner: null,
			deck: { blackCards: [], whiteCards: [] },
			handSize: 7,
			maxRounds: 10,
			currentRound: 0,
			waitingForPlayers: true,
			gameCompleted: false,
			active: false,
			creatorPlayerId: null,
			passwordProtected: false
		} satisfies ClientCAHGameState
	};
};
