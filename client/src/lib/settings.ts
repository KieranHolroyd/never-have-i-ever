import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { Settings } from './types';

export function loadSettings() {
	try {
		if (!browser) return {};

		const local_s = localStorage.getItem('settings');
		if (local_s !== null) return JSON.parse(local_s ?? '{}') as Settings;

		return {};
	} catch (e) {
		return {};
	}
}

export const settingsStore = writable<Settings>(loadSettings());
