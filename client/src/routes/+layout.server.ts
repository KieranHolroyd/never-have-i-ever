import { getUserPreferences } from '$lib/server/user-preferences';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const preferences = locals.user ? await getUserPreferences(locals.user.id) : null;
	return { user: locals.user, preferences };
};
