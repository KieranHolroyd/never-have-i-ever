import { browser } from '$app/environment';
import type { Settings } from './types';

export type Theme = NonNullable<Settings['theme']>;

export function applyTheme(theme: Theme) {
	if (!browser) return;

	const root = document.documentElement;
	root.classList.toggle('dark', theme === 'dark');
	root.style.colorScheme = theme;
}
