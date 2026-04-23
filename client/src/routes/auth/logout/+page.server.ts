import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get(SESSION_COOKIE);
		if (sessionId) {
			await deleteSession(sessionId);
		}
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(302, '/');
	}
};
