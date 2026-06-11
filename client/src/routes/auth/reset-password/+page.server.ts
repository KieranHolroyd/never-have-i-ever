import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { users, verifications } from '@nhie/db/schema';
import { auth } from '$lib/server/auth';
import {
	applyPasswordReset,
	parseResetUserId,
	resetPasswordErrorMessage,
} from '$lib/server/auth/reset-password';
import { db } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

async function findResetVerification(token: string) {
	const [verification] = await db
		.select({
			userId: verifications.value,
			expiresAt: verifications.expiresAt,
		})
		.from(verifications)
		.where(eq(verifications.identifier, `reset-password:${token}`))
		.limit(1);

	if (!verification || verification.expiresAt < new Date()) return null;

	const userId = parseResetUserId(verification.userId);
	if (!userId) return null;

	return { userId, expiresAt: verification.expiresAt };
}

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	const error = url.searchParams.get('error');

	if (error === 'INVALID_TOKEN' || !token) {
		return { token: null, invalid: true };
	}

	const verification = await findResetVerification(token);
	if (!verification) {
		return { token: null, invalid: true };
	}

	return { token, invalid: false };
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const token = String(data.get('token') ?? url.searchParams.get('token') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');

		if (!token) return fail(400, { error: 'This reset link is invalid or has expired.' });
		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}
		if (password.length > MAX_PASSWORD_LENGTH) {
			return fail(400, {
				error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
			});
		}
		if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });

		const verification = await findResetVerification(token);
		if (!verification) {
			return fail(400, { error: 'This reset link is invalid or has expired.' });
		}

		const [user] = await db
			.select({ email: users.email })
			.from(users)
			.where(eq(users.id, verification.userId))
			.limit(1);

		if (!user) {
			return fail(400, { error: 'This reset link is invalid or has expired.' });
		}

		try {
			await applyPasswordReset(verification.userId, password, token, request.headers);
		} catch (err) {
			console.error('[auth] Password reset failed:', err);
			return fail(400, {
				error: resetPasswordErrorMessage(err, MAX_PASSWORD_LENGTH),
			});
		}

		try {
			await auth.api.signInEmail({
				body: { email: user.email, password },
				headers: request.headers,
				asResponse: false,
			});
		} catch (err) {
			console.error('[auth] Auto sign-in after password reset failed:', err);
			redirect(302, '/auth?redirect=/profile&reset=success');
		}

		redirect(302, '/profile?reset=success');
	},
};
