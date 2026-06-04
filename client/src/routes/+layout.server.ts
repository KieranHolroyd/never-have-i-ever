import { getUserPreferences } from '$lib/server/user-preferences';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	let preferences = null;
	if (locals.user) {
		try {
			preferences = await getUserPreferences(locals.user.id);
		} catch (err) {
			console.error('[settings] Failed to load account preferences:', err);
		}
	}
	return { user: locals.user, preferences };
};
