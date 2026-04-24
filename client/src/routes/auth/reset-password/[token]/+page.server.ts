import { fail, redirect } from '@sveltejs/kit';
import { consumeAuthToken, updatePassword, createSession, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Just pass the token through; we validate on submit so the page can render
	return { token: params.token };
};

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.', token: params.token });
		}
		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.', token: params.token });
		}

		const user = await consumeAuthToken(params.token, 'password_reset');
		if (!user) {
			return fail(400, {
				error: 'This reset link is invalid or has expired. Please request a new one.',
				token: params.token,
			});
		}

		await updatePassword(user.id, password);

		// Log the user in automatically after resetting
		const sessionId = await createSession(user.id);
		cookies.set(SESSION_COOKIE, sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 30,
		});

		redirect(302, '/profile');
	},
};
