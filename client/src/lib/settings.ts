import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { Settings } from './types';
import { normalizeSettings, settingsDifferFromDefaults } from './settings-defaults';
import { applyTheme } from './theme';

const STORAGE_KEY = 'settings';

export type SettingsSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'local';

export const settingsStore = writable<Required<Settings>>(normalizeSettings({}));
export const settingsSyncStatus = writable<SettingsSyncStatus>('idle');

let accountUserId: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromStorage(): Partial<Settings> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === null) return {};
		return JSON.parse(raw) as Partial<Settings>;
	} catch {
		return {};
	}
}

function persistLocal(settings: Required<Settings>) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// ignore quota / private mode
	}
}

async function pushToAccount(settings: Required<Settings>): Promise<boolean> {
	if (!accountUserId) return false;
	settingsSyncStatus.set('syncing');
	try {
		const res = await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(settings)
		});
		if (!res.ok) throw new Error(`Sync failed (${res.status})`);
		const payload = (await res.json()) as { preferences: Settings };
		const normalized = normalizeSettings(payload.preferences);
		settingsStore.set(normalized);
		persistLocal(normalized);
		settingsSyncStatus.set('synced');
		return true;
	} catch {
		settingsSyncStatus.set('error');
		return false;
	}
}

function scheduleAccountSync(settings: Required<Settings>) {
	if (!accountUserId || !browser) return;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		void pushToAccount(settings);
	}, 400);
}

/**
 * Hydrate the settings store from SSR data and localStorage.
 * Call from the root layout when `data.user` / `data.preferences` change.
 */
export function initSettings(
	serverPreferences: Settings | null | undefined,
	user: { id: string } | null | undefined
) {
	accountUserId = user?.id ?? null;

	const local = normalizeSettings(loadFromStorage());
	const remote = serverPreferences ? normalizeSettings(serverPreferences) : null;

	if (accountUserId && remote) {
		if (settingsDifferFromDefaults(remote)) {
			settingsStore.set(remote);
			persistLocal(remote);
			settingsSyncStatus.set('synced');
		} else if (settingsDifferFromDefaults(local)) {
			settingsStore.set(local);
			persistLocal(local);
			settingsSyncStatus.set('syncing');
			void pushToAccount(local);
		} else {
			settingsStore.set(remote);
			persistLocal(remote);
			settingsSyncStatus.set('synced');
		}
	} else {
		settingsStore.set(local);
		settingsSyncStatus.set('local');
	}

	applyTheme(get(settingsStore).theme);
}

/** Update one or more preference keys; persists locally and syncs when signed in. */
export function patchSettings(patch: Partial<Settings>) {
	settingsStore.update((current) => {
		const next = normalizeSettings({ ...current, ...patch });
		persistLocal(next);
		if (accountUserId) {
			scheduleAccountSync(next);
		} else {
			settingsSyncStatus.set('local');
		}
		applyTheme(next.theme);
		return next;
	});
}

/** Force-save current settings (guests: local only; accounts: immediate sync). */
export async function saveSettings(): Promise<void> {
	const current = normalizeSettings(get(settingsStore));
	persistLocal(current);
	if (accountUserId) {
		await pushToAccount(current);
	}
}

export function clearAccountSettingsSync() {
	accountUserId = null;
	if (syncTimer) clearTimeout(syncTimer);
	settingsSyncStatus.set('local');
}

/** @deprecated Use initSettings from layout — kept for tests that set localStorage directly. */
export function loadSettings(): Settings {
	return normalizeSettings(loadFromStorage());
}
