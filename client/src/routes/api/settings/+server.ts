import { json, error } from '@sveltejs/kit';
import { normalizeSettings } from '$lib/settings-defaults';
import { getUserPreferences, updateUserPreferences } from '$lib/server/user-preferences';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Sign in to load account settings');
	}
	const preferences = await getUserPreferences(locals.user.id);
	return json({ preferences });
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		error(401, 'Sign in to save account settings');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	if (typeof body !== 'object' || body === null) {
		error(400, 'Expected a settings object');
	}

	const preferences = normalizeSettings(body as Record<string, unknown>);
	const saved = await updateUserPreferences(locals.user.id, preferences);
	return json({ preferences: saved });
};
