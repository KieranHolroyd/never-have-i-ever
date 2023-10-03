/// PLAYER STUFF

import { browser } from '$app/environment';
import { v4 } from 'uuid';
export class LocalPlayer {
	public static get id() {
		if (!browser) return '';
		const ls_player = localStorage.getItem('player_id');
		if (ls_player === null) {
			const player_id = v4();
			localStorage.setItem('player_id', player_id);
			return player_id;
		}
		return ls_player;
	}

	public static get name(): string | null {
		if (!browser) return null;
		const ls_player = localStorage.getItem('player_name');

		return ls_player;
	}

	public static set name(name: string) {
		if (!browser) return;
		if (name === '') return;

		localStorage.setItem('player_name', name);
	}
}
