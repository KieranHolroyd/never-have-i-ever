import { env } from '$env/dynamic/public';
import type { CAHGameState } from '$lib/types.js';
import { redirect } from '@sveltejs/kit';

type ClientCAHGameData = CAHGameState & {
	active: boolean;
};

export async function load({ params }) {
	if (!params.gameid) {
		return redirect(307, '/');
	}

	// For now, return empty data - the game state will be managed via WebSocket
	// TODO: Add API endpoint for CAH game state when needed
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
