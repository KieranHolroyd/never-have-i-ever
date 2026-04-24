import { fail } from '@sveltejs/kit';
import { findUserByEmail, createAuthToken } from '$lib/server/auth';
import { sendPasswordResetEmail } from '$lib/server/mailer';
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

		// Always return success to avoid leaking whether the account exists
		const user = await findUserByEmail(email);
		if (user) {
			const token = await createAuthToken(user.id, 'password_reset');
			const origin = env.PUBLIC_ORIGIN ?? url.origin;
			const resetUrl = `${origin}/auth/reset-password/${token}`;
			await sendPasswordResetEmail(user.email, user.nickname, resetUrl).catch(() => {
				// Log but don't surface email errors to the user
			});
		}

		return { success: true };
	},
};
