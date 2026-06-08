import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const redirect_url = url.searchParams.get('redirect') ?? '/play/name';
		redirect(302, redirect_url);
	}
	return {};
};

export const actions: Actions = {
	register: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const nickname = String(data.get('nickname') ?? '').trim();

		if (!email || !password || !nickname) {
			return fail(400, { action: 'register', error: 'All fields are required.' });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { action: 'register', error: 'Invalid email address.' });
		}
		if (password.length < 8) {
			return fail(400, { action: 'register', error: 'Password must be at least 8 characters.' });
		}
		if (nickname.length < 1 || nickname.length > 30) {
			return fail(400, { action: 'register', error: 'Nickname must be 1–30 characters.' });
		}

		try {
			await auth.api.signUpEmail({
				body: { email, password, name: nickname },
				headers: request.headers,
				asResponse: false,
			});
		} catch {
			return fail(400, { action: 'register', error: 'An account with that email already exists.' });
		}

		const redirect_url = url.searchParams.get('redirect') ?? '/play/name';
		redirect(302, redirect_url);
	},

	login: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { action: 'login', error: 'Email and password are required.' });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: request.headers,
				asResponse: false,
			});
		} catch {
			return fail(400, { action: 'login', error: 'Invalid email or password.' });
		}

		const redirect_url = url.searchParams.get('redirect') ?? '/play/name';
		redirect(302, redirect_url);
	},
};
