import { browser } from '$app/environment';

function roomPasswordKey(gameId: string): string {
	return `room_password:${gameId}`;
}

export function getStoredRoomPassword(gameId: string): string {
	if (!browser) {
		return '';
	}

	return sessionStorage.getItem(roomPasswordKey(gameId)) ?? '';
}

export function storeRoomPassword(gameId: string, password: string): void {
	if (!browser) {
		return;
	}

	const normalized = password.trim();
	if (normalized) {
		sessionStorage.setItem(roomPasswordKey(gameId), normalized);
	} else {
		sessionStorage.removeItem(roomPasswordKey(gameId));
	}
}

export function clearStoredRoomPassword(gameId: string): void {
	if (!browser) {
		return;
	}

	sessionStorage.removeItem(roomPasswordKey(gameId));
}