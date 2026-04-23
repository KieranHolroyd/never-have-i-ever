import { env } from '$env/dynamic/public';
import type { CAHGameState } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';

type ClientCAHGameData = CAHGameState & {
	active: boolean;
};

export async function load({ params, fetch }) {
	if (!params.gameid) {
		return redirect(307, '/');
	}

	try {
		const res = await fetch(`${env.PUBLIC_API_URL}api/cah-game?id=${params.gameid}`);
		if (res.ok) {
			const game = (await res.json()) as ClientCAHGameData;
			return { game };
		}
	} catch {
		// fall through to default
	}

	return {
		game: {
			id: params.gameid,
			players: [],
			selectedPacks: [],
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
			active: false
		} as ClientCAHGameData
	};
}
