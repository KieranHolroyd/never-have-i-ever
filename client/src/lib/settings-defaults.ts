import type { Settings } from './types';

export const DEFAULT_SETTINGS: Required<Settings> = {
	no_nsfw: false,
	no_tutorials: false,
	show_hidden: false,
	show_debug: false
};

export const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

export function normalizeSettings(raw: Partial<Settings> | null | undefined): Required<Settings> {
	return { ...DEFAULT_SETTINGS, ...raw };
}

export function parsePreferencesJson(value: unknown): Required<Settings> {
	if (value === null || value === undefined) return { ...DEFAULT_SETTINGS };
	if (typeof value === 'string') {
		try {
			return normalizeSettings(JSON.parse(value) as Partial<Settings>);
		} catch {
			return { ...DEFAULT_SETTINGS };
		}
	}
	if (typeof value === 'object') {
		return normalizeSettings(value as Partial<Settings>);
	}
	return { ...DEFAULT_SETTINGS };
}

export function settingsDifferFromDefaults(settings: Settings): boolean {
	const n = normalizeSettings(settings);
	return SETTINGS_KEYS.some((key) => n[key] !== DEFAULT_SETTINGS[key]);
}

export function settingsEqual(a: Settings, b: Settings): boolean {
	const na = normalizeSettings(a);
	const nb = normalizeSettings(b);
	return SETTINGS_KEYS.every((key) => na[key] === nb[key]);
}
