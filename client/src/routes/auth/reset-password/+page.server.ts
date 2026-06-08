import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	const error = url.searchParams.get('error');
	if (error === 'INVALID_TOKEN') {
		return { token: null, invalid: true };
	}
	return { token, invalid: !token };
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const token = String(data.get('token') ?? url.searchParams.get('token') ?? '');
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');

		if (!token) return fail(400, { error: 'This reset link is invalid or has expired.' });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });

		try {
			await auth.api.resetPassword({
				body: { newPassword: password, token },
				headers: request.headers,
			});
		} catch {
			return fail(400, { error: 'This reset link is invalid or has expired.' });
		}

		redirect(302, '/auth?redirect=/profile');
	},
};
