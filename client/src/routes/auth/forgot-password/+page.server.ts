import { fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({});

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim().toLowerCase();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		const origin = env.PUBLIC_ORIGIN ?? url.origin;
		await auth.api.requestPasswordReset({
			body: {
				email,
				redirectTo: `${origin}/auth/reset-password`,
			},
			headers: request.headers,
		}).catch(() => {});

		return { success: true };
	},
};
